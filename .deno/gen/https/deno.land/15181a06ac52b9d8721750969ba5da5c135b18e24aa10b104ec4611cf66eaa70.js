import { equals, indexOf, lastIndexOf, startsWith } from "../bytes/mod.ts";
import { copyN } from "../io/ioutil.ts";
import { MultiReader } from "../io/readers.ts";
import { extname } from "../path/mod.ts";
import { BufReader, BufWriter } from "../io/bufio.ts";
import { assert } from "../_util/assert.ts";
import { TextProtoReader } from "../textproto/mod.ts";
import { hasOwnProperty } from "../_util/has_own_property.ts";
import { Buffer } from "../io/buffer.ts";
import { copy } from "../io/util.ts";
export function isFormFile(x) {
    return hasOwnProperty(x, "filename") && hasOwnProperty(x, "type");
}
function randomBoundary() {
    let boundary = "--------------------------";
    for (let i = 0; i < 24; i++) {
        boundary += Math.floor(Math.random() * 16).toString(16);
    }
    return boundary;
}
const encoder = new TextEncoder();
export function matchAfterPrefix(buf, prefix, eof) {
    if (buf.length === prefix.length) {
        return eof ? 1 : 0;
    }
    const c = buf[prefix.length];
    if (c === " ".charCodeAt(0) ||
        c === "\t".charCodeAt(0) ||
        c === "\r".charCodeAt(0) ||
        c === "\n".charCodeAt(0) ||
        c === "-".charCodeAt(0)) {
        return 1;
    }
    return -1;
}
export function scanUntilBoundary(buf, dashBoundary, newLineDashBoundary, total, eof) {
    if (total === 0) {
        if (startsWith(buf, dashBoundary)) {
            switch (matchAfterPrefix(buf, dashBoundary, eof)) {
                case -1:
                    return dashBoundary.length;
                case 0:
                    return 0;
                case 1:
                    return null;
            }
        }
        if (startsWith(dashBoundary, buf)) {
            return 0;
        }
    }
    const i = indexOf(buf, newLineDashBoundary);
    if (i >= 0) {
        switch (matchAfterPrefix(buf.slice(i), newLineDashBoundary, eof)) {
            case -1:
                return i + newLineDashBoundary.length;
            case 0:
                return i;
            case 1:
                return i > 0 ? i : null;
        }
    }
    if (startsWith(newLineDashBoundary, buf)) {
        return 0;
    }
    const j = lastIndexOf(buf, newLineDashBoundary.slice(0, 1));
    if (j >= 0 && startsWith(newLineDashBoundary, buf.slice(j))) {
        return j;
    }
    return buf.length;
}
class PartReader {
    mr;
    headers;
    n = 0;
    total = 0;
    constructor(mr, headers) {
        this.mr = mr;
        this.headers = headers;
    }
    async read(p) {
        const br = this.mr.bufReader;
        let peekLength = 1;
        while (this.n === 0) {
            peekLength = Math.max(peekLength, br.buffered());
            const peekBuf = await br.peek(peekLength);
            if (peekBuf === null) {
                throw new Deno.errors.UnexpectedEof();
            }
            const eof = peekBuf.length < peekLength;
            this.n = scanUntilBoundary(peekBuf, this.mr.dashBoundary, this.mr.newLineDashBoundary, this.total, eof);
            if (this.n === 0) {
                assert(eof === false);
                peekLength++;
            }
        }
        if (this.n === null) {
            return null;
        }
        const nread = Math.min(p.length, this.n);
        const buf = p.subarray(0, nread);
        const r = await br.readFull(buf);
        assert(r === buf);
        this.n -= nread;
        this.total += nread;
        return nread;
    }
    close() { }
    contentDisposition;
    contentDispositionParams;
    getContentDispositionParams() {
        if (this.contentDispositionParams)
            return this.contentDispositionParams;
        const cd = this.headers.get("content-disposition");
        const params = {};
        assert(cd != null, "content-disposition must be set");
        const comps = decodeURI(cd).split(";");
        this.contentDisposition = comps[0];
        comps
            .slice(1)
            .map((v) => v.trim())
            .map((kv) => {
            const [k, v] = kv.split("=");
            if (v) {
                const s = v.charAt(0);
                const e = v.charAt(v.length - 1);
                if ((s === e && s === '"') || s === "'") {
                    params[k] = v.substr(1, v.length - 2);
                }
                else {
                    params[k] = v;
                }
            }
        });
        return (this.contentDispositionParams = params);
    }
    get fileName() {
        return this.getContentDispositionParams()["filename"];
    }
    get formName() {
        const p = this.getContentDispositionParams();
        if (this.contentDisposition === "form-data") {
            return p["name"];
        }
        return "";
    }
}
function skipLWSPChar(u) {
    const ret = new Uint8Array(u.length);
    const sp = " ".charCodeAt(0);
    const ht = "\t".charCodeAt(0);
    let j = 0;
    for (let i = 0; i < u.length; i++) {
        if (u[i] === sp || u[i] === ht)
            continue;
        ret[j++] = u[i];
    }
    return ret.slice(0, j);
}
export class MultipartReader {
    boundary;
    newLine;
    newLineDashBoundary;
    dashBoundaryDash;
    dashBoundary;
    bufReader;
    constructor(reader, boundary) {
        this.boundary = boundary;
        this.newLine = encoder.encode("\r\n");
        this.newLineDashBoundary = encoder.encode(`\r\n--${boundary}`);
        this.dashBoundaryDash = encoder.encode(`--${this.boundary}--`);
        this.dashBoundary = encoder.encode(`--${this.boundary}`);
        this.bufReader = new BufReader(reader);
    }
    async readForm(maxMemoryOrOptions) {
        const options = typeof maxMemoryOrOptions === "number"
            ? { maxMemory: maxMemoryOrOptions }
            : maxMemoryOrOptions;
        let maxMemory = options?.maxMemory ?? 10 << 20;
        const fileMap = new Map();
        const valueMap = new Map();
        let maxValueBytes = maxMemory + (10 << 20);
        const buf = new Buffer(new Uint8Array(maxValueBytes));
        for (;;) {
            const p = await this.nextPart();
            if (p === null) {
                break;
            }
            if (p.formName === "") {
                continue;
            }
            buf.reset();
            if (!p.fileName) {
                const n = await copyN(p, buf, maxValueBytes);
                maxValueBytes -= n;
                if (maxValueBytes < 0) {
                    throw new RangeError("message too large");
                }
                const value = new TextDecoder().decode(buf.bytes());
                const mapVal = valueMap.get(p.formName);
                if (mapVal !== undefined) {
                    mapVal.push(value);
                }
                else {
                    valueMap.set(p.formName, [value]);
                }
                continue;
            }
            let formFile;
            const n = await copyN(p, buf, maxValueBytes);
            const contentType = p.headers.get("content-type");
            assert(contentType != null, "content-type must be set");
            if (n > maxMemory) {
                const ext = extname(p.fileName);
                const filepath = await Deno.makeTempFile({
                    dir: options?.dir ?? ".",
                    prefix: options?.prefix ?? "multipart-",
                    suffix: options?.suffix ?? ext,
                });
                const file = await Deno.open(filepath, { write: true });
                try {
                    const size = await copy(new MultiReader(buf, p), file);
                    file.close();
                    formFile = {
                        filename: p.fileName,
                        type: contentType,
                        tempfile: filepath,
                        size,
                    };
                }
                catch (e) {
                    await Deno.remove(filepath);
                    throw e;
                }
            }
            else {
                formFile = {
                    filename: p.fileName,
                    type: contentType,
                    content: buf.bytes(),
                    size: buf.length,
                };
                maxMemory -= n;
                maxValueBytes -= n;
            }
            if (formFile) {
                const mapVal = fileMap.get(p.formName);
                if (mapVal !== undefined) {
                    mapVal.push(formFile);
                }
                else {
                    fileMap.set(p.formName, [formFile]);
                }
            }
        }
        return multipartFormData(fileMap, valueMap);
    }
    currentPart;
    partsRead = 0;
    async nextPart() {
        if (this.currentPart) {
            this.currentPart.close();
        }
        if (equals(this.dashBoundary, encoder.encode("--"))) {
            throw new Error("boundary is empty");
        }
        let expectNewPart = false;
        for (;;) {
            const line = await this.bufReader.readSlice("\n".charCodeAt(0));
            if (line === null) {
                throw new Deno.errors.UnexpectedEof();
            }
            if (this.isBoundaryDelimiterLine(line)) {
                this.partsRead++;
                const r = new TextProtoReader(this.bufReader);
                const headers = await r.readMIMEHeader();
                if (headers === null) {
                    throw new Deno.errors.UnexpectedEof();
                }
                const np = new PartReader(this, headers);
                this.currentPart = np;
                return np;
            }
            if (this.isFinalBoundary(line)) {
                return null;
            }
            if (expectNewPart) {
                throw new Error(`expecting a new Part; got line ${line}`);
            }
            if (this.partsRead === 0) {
                continue;
            }
            if (equals(line, this.newLine)) {
                expectNewPart = true;
                continue;
            }
            throw new Error(`unexpected line in nextPart(): ${line}`);
        }
    }
    isFinalBoundary(line) {
        if (!startsWith(line, this.dashBoundaryDash)) {
            return false;
        }
        const rest = line.slice(this.dashBoundaryDash.length, line.length);
        return rest.length === 0 || equals(skipLWSPChar(rest), this.newLine);
    }
    isBoundaryDelimiterLine(line) {
        if (!startsWith(line, this.dashBoundary)) {
            return false;
        }
        const rest = line.slice(this.dashBoundary.length);
        return equals(skipLWSPChar(rest), this.newLine);
    }
}
function multipartFormData(fileMap, valueMap) {
    function files(key) {
        return fileMap.get(key);
    }
    function values(key) {
        return valueMap.get(key);
    }
    function* entries() {
        yield* fileMap;
        yield* valueMap;
    }
    async function removeAll() {
        const promises = [];
        for (const val of fileMap.values()) {
            for (const subVal of val) {
                if (!subVal.tempfile)
                    continue;
                promises.push(Deno.remove(subVal.tempfile));
            }
        }
        await Promise.all(promises);
    }
    return {
        files,
        values,
        entries,
        removeAll,
        [Symbol.iterator]() {
            return entries();
        },
    };
}
class PartWriter {
    writer;
    boundary;
    headers;
    closed = false;
    partHeader;
    headersWritten = false;
    constructor(writer, boundary, headers, isFirstBoundary) {
        this.writer = writer;
        this.boundary = boundary;
        this.headers = headers;
        let buf = "";
        if (isFirstBoundary) {
            buf += `--${boundary}\r\n`;
        }
        else {
            buf += `\r\n--${boundary}\r\n`;
        }
        for (const [key, value] of headers.entries()) {
            buf += `${key}: ${value}\r\n`;
        }
        buf += `\r\n`;
        this.partHeader = buf;
    }
    close() {
        this.closed = true;
    }
    async write(p) {
        if (this.closed) {
            throw new Error("part is closed");
        }
        if (!this.headersWritten) {
            await this.writer.write(encoder.encode(this.partHeader));
            this.headersWritten = true;
        }
        return this.writer.write(p);
    }
}
function checkBoundary(b) {
    if (b.length < 1 || b.length > 70) {
        throw new Error(`invalid boundary length: ${b.length}`);
    }
    const end = b.length - 1;
    for (let i = 0; i < end; i++) {
        const c = b.charAt(i);
        if (!c.match(/[a-zA-Z0-9'()+_,\-./:=?]/) || (c === " " && i !== end)) {
            throw new Error("invalid boundary character: " + c);
        }
    }
    return b;
}
export class MultipartWriter {
    writer;
    _boundary;
    get boundary() {
        return this._boundary;
    }
    lastPart;
    bufWriter;
    isClosed = false;
    constructor(writer, boundary) {
        this.writer = writer;
        if (boundary !== void 0) {
            this._boundary = checkBoundary(boundary);
        }
        else {
            this._boundary = randomBoundary();
        }
        this.bufWriter = new BufWriter(writer);
    }
    formDataContentType() {
        return `multipart/form-data; boundary=${this.boundary}`;
    }
    createPart(headers) {
        if (this.isClosed) {
            throw new Error("multipart: writer is closed");
        }
        if (this.lastPart) {
            this.lastPart.close();
        }
        const part = new PartWriter(this.writer, this.boundary, headers, !this.lastPart);
        this.lastPart = part;
        return part;
    }
    createFormFile(field, filename) {
        const h = new Headers();
        h.set("Content-Disposition", `form-data; name="${field}"; filename="${filename}"`);
        h.set("Content-Type", "application/octet-stream");
        return this.createPart(h);
    }
    createFormField(field) {
        const h = new Headers();
        h.set("Content-Disposition", `form-data; name="${field}"`);
        h.set("Content-Type", "application/octet-stream");
        return this.createPart(h);
    }
    async writeField(field, value) {
        const f = await this.createFormField(field);
        await f.write(encoder.encode(value));
    }
    async writeFile(field, filename, file) {
        const f = await this.createFormFile(field, filename);
        await copy(file, f);
    }
    flush() {
        return this.bufWriter.flush();
    }
    async close() {
        if (this.isClosed) {
            throw new Error("multipart: writer is closed");
        }
        if (this.lastPart) {
            this.lastPart.close();
            this.lastPart = void 0;
        }
        await this.writer.write(encoder.encode(`\r\n--${this.boundary}--\r\n`));
        await this.flush();
        this.isClosed = true;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibXVsdGlwYXJ0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsibXVsdGlwYXJ0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUNBLE9BQU8sRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxVQUFVLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUMzRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFDeEMsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGtCQUFrQixDQUFDO0FBQy9DLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQztBQUN6QyxPQUFPLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRSxNQUFNLGdCQUFnQixDQUFDO0FBQ3RELE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM1QyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFDdEQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQzlELE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUN6QyxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sZUFBZSxDQUFDO0FBb0JyQyxNQUFNLFVBQVUsVUFBVSxDQUFDLENBQU07SUFDL0IsT0FBTyxjQUFjLENBQUMsQ0FBQyxFQUFFLFVBQVUsQ0FBQyxJQUFJLGNBQWMsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUM7QUFDcEUsQ0FBQztBQUVELFNBQVMsY0FBYztJQUNyQixJQUFJLFFBQVEsR0FBRyw0QkFBNEIsQ0FBQztJQUM1QyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFO1FBQzNCLFFBQVEsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUM7S0FDekQ7SUFDRCxPQUFPLFFBQVEsQ0FBQztBQUNsQixDQUFDO0FBRUQsTUFBTSxPQUFPLEdBQUcsSUFBSSxXQUFXLEVBQUUsQ0FBQztBQWtCbEMsTUFBTSxVQUFVLGdCQUFnQixDQUM5QixHQUFlLEVBQ2YsTUFBa0IsRUFDbEIsR0FBWTtJQUVaLElBQUksR0FBRyxDQUFDLE1BQU0sS0FBSyxNQUFNLENBQUMsTUFBTSxFQUFFO1FBQ2hDLE9BQU8sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztLQUNwQjtJQUNELE1BQU0sQ0FBQyxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDN0IsSUFDRSxDQUFDLEtBQUssR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7UUFDdkIsQ0FBQyxLQUFLLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDO1FBQ3hCLENBQUMsS0FBSyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztRQUN4QixDQUFDLEtBQUssSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7UUFDeEIsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLEVBQ3ZCO1FBQ0EsT0FBTyxDQUFDLENBQUM7S0FDVjtJQUNELE9BQU8sQ0FBQyxDQUFDLENBQUM7QUFDWixDQUFDO0FBa0JELE1BQU0sVUFBVSxpQkFBaUIsQ0FDL0IsR0FBZSxFQUNmLFlBQXdCLEVBQ3hCLG1CQUErQixFQUMvQixLQUFhLEVBQ2IsR0FBWTtJQUVaLElBQUksS0FBSyxLQUFLLENBQUMsRUFBRTtRQUVmLElBQUksVUFBVSxDQUFDLEdBQUcsRUFBRSxZQUFZLENBQUMsRUFBRTtZQUNqQyxRQUFRLGdCQUFnQixDQUFDLEdBQUcsRUFBRSxZQUFZLEVBQUUsR0FBRyxDQUFDLEVBQUU7Z0JBQ2hELEtBQUssQ0FBQyxDQUFDO29CQUNMLE9BQU8sWUFBWSxDQUFDLE1BQU0sQ0FBQztnQkFDN0IsS0FBSyxDQUFDO29CQUNKLE9BQU8sQ0FBQyxDQUFDO2dCQUNYLEtBQUssQ0FBQztvQkFDSixPQUFPLElBQUksQ0FBQzthQUNmO1NBQ0Y7UUFDRCxJQUFJLFVBQVUsQ0FBQyxZQUFZLEVBQUUsR0FBRyxDQUFDLEVBQUU7WUFDakMsT0FBTyxDQUFDLENBQUM7U0FDVjtLQUNGO0lBR0QsTUFBTSxDQUFDLEdBQUcsT0FBTyxDQUFDLEdBQUcsRUFBRSxtQkFBbUIsQ0FBQyxDQUFDO0lBQzVDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRTtRQUNWLFFBQVEsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxtQkFBbUIsRUFBRSxHQUFHLENBQUMsRUFBRTtZQUNoRSxLQUFLLENBQUMsQ0FBQztnQkFDTCxPQUFPLENBQUMsR0FBRyxtQkFBbUIsQ0FBQyxNQUFNLENBQUM7WUFDeEMsS0FBSyxDQUFDO2dCQUNKLE9BQU8sQ0FBQyxDQUFDO1lBQ1gsS0FBSyxDQUFDO2dCQUNKLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7U0FDM0I7S0FDRjtJQUNELElBQUksVUFBVSxDQUFDLG1CQUFtQixFQUFFLEdBQUcsQ0FBQyxFQUFFO1FBQ3hDLE9BQU8sQ0FBQyxDQUFDO0tBQ1Y7SUFLRCxNQUFNLENBQUMsR0FBRyxXQUFXLENBQUMsR0FBRyxFQUFFLG1CQUFtQixDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUM1RCxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksVUFBVSxDQUFDLG1CQUFtQixFQUFFLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRTtRQUMzRCxPQUFPLENBQUMsQ0FBQztLQUNWO0lBRUQsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDO0FBQ3BCLENBQUM7QUFFRCxNQUFNLFVBQVU7SUFJTTtJQUFxQztJQUh6RCxDQUFDLEdBQWtCLENBQUMsQ0FBQztJQUNyQixLQUFLLEdBQUcsQ0FBQyxDQUFDO0lBRVYsWUFBb0IsRUFBbUIsRUFBa0IsT0FBZ0I7UUFBckQsT0FBRSxHQUFGLEVBQUUsQ0FBaUI7UUFBa0IsWUFBTyxHQUFQLE9BQU8sQ0FBUztJQUFHLENBQUM7SUFFN0UsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFhO1FBQ3RCLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxFQUFFLENBQUMsU0FBUyxDQUFDO1FBSTdCLElBQUksVUFBVSxHQUFHLENBQUMsQ0FBQztRQUNuQixPQUFPLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFO1lBQ25CLFVBQVUsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLFVBQVUsRUFBRSxFQUFFLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztZQUNqRCxNQUFNLE9BQU8sR0FBRyxNQUFNLEVBQUUsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7WUFDMUMsSUFBSSxPQUFPLEtBQUssSUFBSSxFQUFFO2dCQUNwQixNQUFNLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxhQUFhLEVBQUUsQ0FBQzthQUN2QztZQUNELE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxNQUFNLEdBQUcsVUFBVSxDQUFDO1lBQ3hDLElBQUksQ0FBQyxDQUFDLEdBQUcsaUJBQWlCLENBQ3hCLE9BQU8sRUFDUCxJQUFJLENBQUMsRUFBRSxDQUFDLFlBQVksRUFDcEIsSUFBSSxDQUFDLEVBQUUsQ0FBQyxtQkFBbUIsRUFDM0IsSUFBSSxDQUFDLEtBQUssRUFDVixHQUFHLENBQ0osQ0FBQztZQUNGLElBQUksSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUU7Z0JBRWhCLE1BQU0sQ0FBQyxHQUFHLEtBQUssS0FBSyxDQUFDLENBQUM7Z0JBQ3RCLFVBQVUsRUFBRSxDQUFDO2FBQ2Q7U0FDRjtRQUVELElBQUksSUFBSSxDQUFDLENBQUMsS0FBSyxJQUFJLEVBQUU7WUFDbkIsT0FBTyxJQUFJLENBQUM7U0FDYjtRQUVELE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDekMsTUFBTSxHQUFHLEdBQUcsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDakMsTUFBTSxDQUFDLEdBQUcsTUFBTSxFQUFFLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ2pDLE1BQU0sQ0FBQyxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUM7UUFDbEIsSUFBSSxDQUFDLENBQUMsSUFBSSxLQUFLLENBQUM7UUFDaEIsSUFBSSxDQUFDLEtBQUssSUFBSSxLQUFLLENBQUM7UUFDcEIsT0FBTyxLQUFLLENBQUM7SUFDZixDQUFDO0lBRUQsS0FBSyxLQUFVLENBQUM7SUFFUixrQkFBa0IsQ0FBVTtJQUM1Qix3QkFBd0IsQ0FBNkI7SUFFckQsMkJBQTJCO1FBQ2pDLElBQUksSUFBSSxDQUFDLHdCQUF3QjtZQUFFLE9BQU8sSUFBSSxDQUFDLHdCQUF3QixDQUFDO1FBQ3hFLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLHFCQUFxQixDQUFDLENBQUM7UUFDbkQsTUFBTSxNQUFNLEdBQThCLEVBQUUsQ0FBQztRQUM3QyxNQUFNLENBQUMsRUFBRSxJQUFJLElBQUksRUFBRSxpQ0FBaUMsQ0FBQyxDQUFDO1FBQ3RELE1BQU0sS0FBSyxHQUFHLFNBQVMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDdkMsSUFBSSxDQUFDLGtCQUFrQixHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNuQyxLQUFLO2FBQ0YsS0FBSyxDQUFDLENBQUMsQ0FBQzthQUNSLEdBQUcsQ0FBQyxDQUFDLENBQVMsRUFBVSxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO2FBQ3BDLEdBQUcsQ0FBQyxDQUFDLEVBQVUsRUFBUSxFQUFFO1lBQ3hCLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUM3QixJQUFJLENBQUMsRUFBRTtnQkFDTCxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUN0QixNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7Z0JBQ2pDLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssR0FBRyxFQUFFO29CQUN2QyxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQztpQkFDdkM7cUJBQU07b0JBQ0wsTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztpQkFDZjthQUNGO1FBQ0gsQ0FBQyxDQUFDLENBQUM7UUFDTCxPQUFPLENBQUMsSUFBSSxDQUFDLHdCQUF3QixHQUFHLE1BQU0sQ0FBQyxDQUFDO0lBQ2xELENBQUM7SUFFRCxJQUFJLFFBQVE7UUFDVixPQUFPLElBQUksQ0FBQywyQkFBMkIsRUFBRSxDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBQ3hELENBQUM7SUFFRCxJQUFJLFFBQVE7UUFDVixNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsMkJBQTJCLEVBQUUsQ0FBQztRQUM3QyxJQUFJLElBQUksQ0FBQyxrQkFBa0IsS0FBSyxXQUFXLEVBQUU7WUFDM0MsT0FBTyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUM7U0FDbEI7UUFDRCxPQUFPLEVBQUUsQ0FBQztJQUNaLENBQUM7Q0FDRjtBQUVELFNBQVMsWUFBWSxDQUFDLENBQWE7SUFDakMsTUFBTSxHQUFHLEdBQUcsSUFBSSxVQUFVLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ3JDLE1BQU0sRUFBRSxHQUFHLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDN0IsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUM5QixJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDVixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtRQUNqQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUU7WUFBRSxTQUFTO1FBQ3pDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztLQUNqQjtJQUNELE9BQU8sR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7QUFDekIsQ0FBQztBQWtDRCxNQUFNLE9BQU8sZUFBZTtJQU9lO0lBTmhDLE9BQU8sQ0FBYTtJQUNwQixtQkFBbUIsQ0FBYTtJQUNoQyxnQkFBZ0IsQ0FBYTtJQUM3QixZQUFZLENBQWE7SUFDekIsU0FBUyxDQUFZO0lBRTlCLFlBQVksTUFBbUIsRUFBVSxRQUFnQjtRQUFoQixhQUFRLEdBQVIsUUFBUSxDQUFRO1FBQ3ZELElBQUksQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUN0QyxJQUFJLENBQUMsbUJBQW1CLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxTQUFTLFFBQVEsRUFBRSxDQUFDLENBQUM7UUFDL0QsSUFBSSxDQUFDLGdCQUFnQixHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsS0FBSyxJQUFJLENBQUMsUUFBUSxJQUFJLENBQUMsQ0FBQztRQUMvRCxJQUFJLENBQUMsWUFBWSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsS0FBSyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztRQUN6RCxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ3pDLENBQUM7SUFtQkQsS0FBSyxDQUFDLFFBQVEsQ0FDWixrQkFBNkM7UUFFN0MsTUFBTSxPQUFPLEdBQUcsT0FBTyxrQkFBa0IsS0FBSyxRQUFRO1lBQ3BELENBQUMsQ0FBQyxFQUFFLFNBQVMsRUFBRSxrQkFBa0IsRUFBRTtZQUNuQyxDQUFDLENBQUMsa0JBQWtCLENBQUM7UUFDdkIsSUFBSSxTQUFTLEdBQUcsT0FBTyxFQUFFLFNBQVMsSUFBSSxFQUFFLElBQUksRUFBRSxDQUFDO1FBQy9DLE1BQU0sT0FBTyxHQUFHLElBQUksR0FBRyxFQUFzQixDQUFDO1FBQzlDLE1BQU0sUUFBUSxHQUFHLElBQUksR0FBRyxFQUFvQixDQUFDO1FBQzdDLElBQUksYUFBYSxHQUFHLFNBQVMsR0FBRyxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztRQUMzQyxNQUFNLEdBQUcsR0FBRyxJQUFJLE1BQU0sQ0FBQyxJQUFJLFVBQVUsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDO1FBQ3RELFNBQVM7WUFDUCxNQUFNLENBQUMsR0FBRyxNQUFNLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNoQyxJQUFJLENBQUMsS0FBSyxJQUFJLEVBQUU7Z0JBQ2QsTUFBTTthQUNQO1lBQ0QsSUFBSSxDQUFDLENBQUMsUUFBUSxLQUFLLEVBQUUsRUFBRTtnQkFDckIsU0FBUzthQUNWO1lBQ0QsR0FBRyxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ1osSUFBSSxDQUFDLENBQUMsQ0FBQyxRQUFRLEVBQUU7Z0JBRWYsTUFBTSxDQUFDLEdBQUcsTUFBTSxLQUFLLENBQUMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxhQUFhLENBQUMsQ0FBQztnQkFDN0MsYUFBYSxJQUFJLENBQUMsQ0FBQztnQkFDbkIsSUFBSSxhQUFhLEdBQUcsQ0FBQyxFQUFFO29CQUNyQixNQUFNLElBQUksVUFBVSxDQUFDLG1CQUFtQixDQUFDLENBQUM7aUJBQzNDO2dCQUNELE1BQU0sS0FBSyxHQUFHLElBQUksV0FBVyxFQUFFLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDO2dCQUNwRCxNQUFNLE1BQU0sR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQztnQkFDeEMsSUFBSSxNQUFNLEtBQUssU0FBUyxFQUFFO29CQUN4QixNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO2lCQUNwQjtxQkFBTTtvQkFDTCxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO2lCQUNuQztnQkFDRCxTQUFTO2FBQ1Y7WUFFRCxJQUFJLFFBQTJDLENBQUM7WUFDaEQsTUFBTSxDQUFDLEdBQUcsTUFBTSxLQUFLLENBQUMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxhQUFhLENBQUMsQ0FBQztZQUM3QyxNQUFNLFdBQVcsR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQztZQUNsRCxNQUFNLENBQUMsV0FBVyxJQUFJLElBQUksRUFBRSwwQkFBMEIsQ0FBQyxDQUFDO1lBQ3hELElBQUksQ0FBQyxHQUFHLFNBQVMsRUFBRTtnQkFFakIsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQztnQkFDaEMsTUFBTSxRQUFRLEdBQUcsTUFBTSxJQUFJLENBQUMsWUFBWSxDQUFDO29CQUN2QyxHQUFHLEVBQUUsT0FBTyxFQUFFLEdBQUcsSUFBSSxHQUFHO29CQUN4QixNQUFNLEVBQUUsT0FBTyxFQUFFLE1BQU0sSUFBSSxZQUFZO29CQUN2QyxNQUFNLEVBQUUsT0FBTyxFQUFFLE1BQU0sSUFBSSxHQUFHO2lCQUMvQixDQUFDLENBQUM7Z0JBRUgsTUFBTSxJQUFJLEdBQUcsTUFBTSxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO2dCQUV4RCxJQUFJO29CQUNGLE1BQU0sSUFBSSxHQUFHLE1BQU0sSUFBSSxDQUFDLElBQUksV0FBVyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztvQkFFdkQsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO29CQUNiLFFBQVEsR0FBRzt3QkFDVCxRQUFRLEVBQUUsQ0FBQyxDQUFDLFFBQVE7d0JBQ3BCLElBQUksRUFBRSxXQUFXO3dCQUNqQixRQUFRLEVBQUUsUUFBUTt3QkFDbEIsSUFBSTtxQkFDTCxDQUFDO2lCQUNIO2dCQUFDLE9BQU8sQ0FBQyxFQUFFO29CQUNWLE1BQU0sSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQztvQkFDNUIsTUFBTSxDQUFDLENBQUM7aUJBQ1Q7YUFDRjtpQkFBTTtnQkFDTCxRQUFRLEdBQUc7b0JBQ1QsUUFBUSxFQUFFLENBQUMsQ0FBQyxRQUFRO29CQUNwQixJQUFJLEVBQUUsV0FBVztvQkFDakIsT0FBTyxFQUFFLEdBQUcsQ0FBQyxLQUFLLEVBQUU7b0JBQ3BCLElBQUksRUFBRSxHQUFHLENBQUMsTUFBTTtpQkFDakIsQ0FBQztnQkFDRixTQUFTLElBQUksQ0FBQyxDQUFDO2dCQUNmLGFBQWEsSUFBSSxDQUFDLENBQUM7YUFDcEI7WUFDRCxJQUFJLFFBQVEsRUFBRTtnQkFDWixNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQztnQkFDdkMsSUFBSSxNQUFNLEtBQUssU0FBUyxFQUFFO29CQUN4QixNQUFNLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO2lCQUN2QjtxQkFBTTtvQkFDTCxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO2lCQUNyQzthQUNGO1NBQ0Y7UUFDRCxPQUFPLGlCQUFpQixDQUFDLE9BQU8sRUFBRSxRQUFRLENBQUMsQ0FBQztJQUM5QyxDQUFDO0lBRU8sV0FBVyxDQUF5QjtJQUNwQyxTQUFTLEdBQUcsQ0FBQyxDQUFDO0lBRWQsS0FBSyxDQUFDLFFBQVE7UUFDcEIsSUFBSSxJQUFJLENBQUMsV0FBVyxFQUFFO1lBQ3BCLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLENBQUM7U0FDMUI7UUFDRCxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRTtZQUNuRCxNQUFNLElBQUksS0FBSyxDQUFDLG1CQUFtQixDQUFDLENBQUM7U0FDdEM7UUFDRCxJQUFJLGFBQWEsR0FBRyxLQUFLLENBQUM7UUFDMUIsU0FBUztZQUNQLE1BQU0sSUFBSSxHQUFHLE1BQU0sSUFBSSxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ2hFLElBQUksSUFBSSxLQUFLLElBQUksRUFBRTtnQkFDakIsTUFBTSxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsYUFBYSxFQUFFLENBQUM7YUFDdkM7WUFDRCxJQUFJLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxJQUFJLENBQUMsRUFBRTtnQkFDdEMsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO2dCQUNqQixNQUFNLENBQUMsR0FBRyxJQUFJLGVBQWUsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7Z0JBQzlDLE1BQU0sT0FBTyxHQUFHLE1BQU0sQ0FBQyxDQUFDLGNBQWMsRUFBRSxDQUFDO2dCQUN6QyxJQUFJLE9BQU8sS0FBSyxJQUFJLEVBQUU7b0JBQ3BCLE1BQU0sSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLGFBQWEsRUFBRSxDQUFDO2lCQUN2QztnQkFDRCxNQUFNLEVBQUUsR0FBRyxJQUFJLFVBQVUsQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUM7Z0JBQ3pDLElBQUksQ0FBQyxXQUFXLEdBQUcsRUFBRSxDQUFDO2dCQUN0QixPQUFPLEVBQUUsQ0FBQzthQUNYO1lBQ0QsSUFBSSxJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxFQUFFO2dCQUM5QixPQUFPLElBQUksQ0FBQzthQUNiO1lBQ0QsSUFBSSxhQUFhLEVBQUU7Z0JBQ2pCLE1BQU0sSUFBSSxLQUFLLENBQUMsa0NBQWtDLElBQUksRUFBRSxDQUFDLENBQUM7YUFDM0Q7WUFDRCxJQUFJLElBQUksQ0FBQyxTQUFTLEtBQUssQ0FBQyxFQUFFO2dCQUN4QixTQUFTO2FBQ1Y7WUFDRCxJQUFJLE1BQU0sQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFO2dCQUM5QixhQUFhLEdBQUcsSUFBSSxDQUFDO2dCQUNyQixTQUFTO2FBQ1Y7WUFDRCxNQUFNLElBQUksS0FBSyxDQUFDLGtDQUFrQyxJQUFJLEVBQUUsQ0FBQyxDQUFDO1NBQzNEO0lBQ0gsQ0FBQztJQUVPLGVBQWUsQ0FBQyxJQUFnQjtRQUN0QyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsRUFBRTtZQUM1QyxPQUFPLEtBQUssQ0FBQztTQUNkO1FBQ0QsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUNuRSxPQUFPLElBQUksQ0FBQyxNQUFNLEtBQUssQ0FBQyxJQUFJLE1BQU0sQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQ3ZFLENBQUM7SUFFTyx1QkFBdUIsQ0FBQyxJQUFnQjtRQUM5QyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLEVBQUU7WUFDeEMsT0FBTyxLQUFLLENBQUM7U0FDZDtRQUNELE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUNsRCxPQUFPLE1BQU0sQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQ2xELENBQUM7Q0FDRjtBQUVELFNBQVMsaUJBQWlCLENBQ3hCLE9BQWdDLEVBQ2hDLFFBQStCO0lBRS9CLFNBQVMsS0FBSyxDQUFDLEdBQVc7UUFDeEIsT0FBTyxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQzFCLENBQUM7SUFDRCxTQUFTLE1BQU0sQ0FBQyxHQUFXO1FBQ3pCLE9BQU8sUUFBUSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUMzQixDQUFDO0lBQ0QsUUFBUSxDQUFDLENBQUMsT0FBTztRQUdmLEtBQUssQ0FBQyxDQUFDLE9BQU8sQ0FBQztRQUNmLEtBQUssQ0FBQyxDQUFDLFFBQVEsQ0FBQztJQUNsQixDQUFDO0lBQ0QsS0FBSyxVQUFVLFNBQVM7UUFDdEIsTUFBTSxRQUFRLEdBQXlCLEVBQUUsQ0FBQztRQUMxQyxLQUFLLE1BQU0sR0FBRyxJQUFJLE9BQU8sQ0FBQyxNQUFNLEVBQUUsRUFBRTtZQUNsQyxLQUFLLE1BQU0sTUFBTSxJQUFJLEdBQUcsRUFBRTtnQkFDeEIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRO29CQUFFLFNBQVM7Z0JBQy9CLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQzthQUM3QztTQUNGO1FBQ0QsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQzlCLENBQUM7SUFDRCxPQUFPO1FBQ0wsS0FBSztRQUNMLE1BQU07UUFDTixPQUFPO1FBQ1AsU0FBUztRQUNULENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQztZQUdmLE9BQU8sT0FBTyxFQUFFLENBQUM7UUFDbkIsQ0FBQztLQUNGLENBQUM7QUFDSixDQUFDO0FBRUQsTUFBTSxVQUFVO0lBTUo7SUFDQztJQUNGO0lBUFQsTUFBTSxHQUFHLEtBQUssQ0FBQztJQUNFLFVBQVUsQ0FBUztJQUM1QixjQUFjLEdBQUcsS0FBSyxDQUFDO0lBRS9CLFlBQ1UsTUFBbUIsRUFDbEIsUUFBZ0IsRUFDbEIsT0FBZ0IsRUFDdkIsZUFBd0I7UUFIaEIsV0FBTSxHQUFOLE1BQU0sQ0FBYTtRQUNsQixhQUFRLEdBQVIsUUFBUSxDQUFRO1FBQ2xCLFlBQU8sR0FBUCxPQUFPLENBQVM7UUFHdkIsSUFBSSxHQUFHLEdBQUcsRUFBRSxDQUFDO1FBQ2IsSUFBSSxlQUFlLEVBQUU7WUFDbkIsR0FBRyxJQUFJLEtBQUssUUFBUSxNQUFNLENBQUM7U0FDNUI7YUFBTTtZQUNMLEdBQUcsSUFBSSxTQUFTLFFBQVEsTUFBTSxDQUFDO1NBQ2hDO1FBQ0QsS0FBSyxNQUFNLENBQUMsR0FBRyxFQUFFLEtBQUssQ0FBQyxJQUFJLE9BQU8sQ0FBQyxPQUFPLEVBQUUsRUFBRTtZQUM1QyxHQUFHLElBQUksR0FBRyxHQUFHLEtBQUssS0FBSyxNQUFNLENBQUM7U0FDL0I7UUFDRCxHQUFHLElBQUksTUFBTSxDQUFDO1FBQ2QsSUFBSSxDQUFDLFVBQVUsR0FBRyxHQUFHLENBQUM7SUFDeEIsQ0FBQztJQUVELEtBQUs7UUFDSCxJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQztJQUNyQixDQUFDO0lBRUQsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFhO1FBQ3ZCLElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRTtZQUNmLE1BQU0sSUFBSSxLQUFLLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztTQUNuQztRQUNELElBQUksQ0FBQyxJQUFJLENBQUMsY0FBYyxFQUFFO1lBQ3hCLE1BQU0sSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztZQUN6RCxJQUFJLENBQUMsY0FBYyxHQUFHLElBQUksQ0FBQztTQUM1QjtRQUNELE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDOUIsQ0FBQztDQUNGO0FBRUQsU0FBUyxhQUFhLENBQUMsQ0FBUztJQUM5QixJQUFJLENBQUMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxNQUFNLEdBQUcsRUFBRSxFQUFFO1FBQ2pDLE1BQU0sSUFBSSxLQUFLLENBQUMsNEJBQTRCLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDO0tBQ3pEO0lBQ0QsTUFBTSxHQUFHLEdBQUcsQ0FBQyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUM7SUFDekIsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLEVBQUUsRUFBRTtRQUM1QixNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3RCLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLDBCQUEwQixDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxHQUFHLENBQUMsRUFBRTtZQUNwRSxNQUFNLElBQUksS0FBSyxDQUFDLDhCQUE4QixHQUFHLENBQUMsQ0FBQyxDQUFDO1NBQ3JEO0tBQ0Y7SUFDRCxPQUFPLENBQUMsQ0FBQztBQUNYLENBQUM7QUFHRCxNQUFNLE9BQU8sZUFBZTtJQVdHO0lBVlosU0FBUyxDQUFTO0lBRW5DLElBQUksUUFBUTtRQUNWLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQztJQUN4QixDQUFDO0lBRU8sUUFBUSxDQUF5QjtJQUNqQyxTQUFTLENBQVk7SUFDckIsUUFBUSxHQUFHLEtBQUssQ0FBQztJQUV6QixZQUE2QixNQUFtQixFQUFFLFFBQWlCO1FBQXRDLFdBQU0sR0FBTixNQUFNLENBQWE7UUFDOUMsSUFBSSxRQUFRLEtBQUssS0FBSyxDQUFDLEVBQUU7WUFDdkIsSUFBSSxDQUFDLFNBQVMsR0FBRyxhQUFhLENBQUMsUUFBUSxDQUFDLENBQUM7U0FDMUM7YUFBTTtZQUNMLElBQUksQ0FBQyxTQUFTLEdBQUcsY0FBYyxFQUFFLENBQUM7U0FDbkM7UUFDRCxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ3pDLENBQUM7SUFFRCxtQkFBbUI7UUFDakIsT0FBTyxpQ0FBaUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO0lBQzFELENBQUM7SUFFRCxVQUFVLENBQUMsT0FBZ0I7UUFDekIsSUFBSSxJQUFJLENBQUMsUUFBUSxFQUFFO1lBQ2pCLE1BQU0sSUFBSSxLQUFLLENBQUMsNkJBQTZCLENBQUMsQ0FBQztTQUNoRDtRQUNELElBQUksSUFBSSxDQUFDLFFBQVEsRUFBRTtZQUNqQixJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRSxDQUFDO1NBQ3ZCO1FBQ0QsTUFBTSxJQUFJLEdBQUcsSUFBSSxVQUFVLENBQ3pCLElBQUksQ0FBQyxNQUFNLEVBQ1gsSUFBSSxDQUFDLFFBQVEsRUFDYixPQUFPLEVBQ1AsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUNmLENBQUM7UUFDRixJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQztRQUNyQixPQUFPLElBQUksQ0FBQztJQUNkLENBQUM7SUFFRCxjQUFjLENBQ1osS0FBYSxFQUNiLFFBQWdCO1FBRWhCLE1BQU0sQ0FBQyxHQUFHLElBQUksT0FBTyxFQUFFLENBQUM7UUFDeEIsQ0FBQyxDQUFDLEdBQUcsQ0FDSCxxQkFBcUIsRUFDckIsb0JBQW9CLEtBQUssZ0JBQWdCLFFBQVEsR0FBRyxDQUNyRCxDQUFDO1FBQ0YsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxjQUFjLEVBQUUsMEJBQTBCLENBQUMsQ0FBQztRQUNsRCxPQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDNUIsQ0FBQztJQUVELGVBQWUsQ0FBQyxLQUFhO1FBQzNCLE1BQU0sQ0FBQyxHQUFHLElBQUksT0FBTyxFQUFFLENBQUM7UUFDeEIsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsRUFBRSxvQkFBb0IsS0FBSyxHQUFHLENBQUMsQ0FBQztRQUMzRCxDQUFDLENBQUMsR0FBRyxDQUFDLGNBQWMsRUFBRSwwQkFBMEIsQ0FBQyxDQUFDO1FBQ2xELE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUM1QixDQUFDO0lBRUQsS0FBSyxDQUFDLFVBQVUsQ0FBQyxLQUFhLEVBQUUsS0FBYTtRQUMzQyxNQUFNLENBQUMsR0FBRyxNQUFNLElBQUksQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDNUMsTUFBTSxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztJQUN2QyxDQUFDO0lBRUQsS0FBSyxDQUFDLFNBQVMsQ0FDYixLQUFhLEVBQ2IsUUFBZ0IsRUFDaEIsSUFBaUI7UUFFakIsTUFBTSxDQUFDLEdBQUcsTUFBTSxJQUFJLENBQUMsY0FBYyxDQUFDLEtBQUssRUFBRSxRQUFRLENBQUMsQ0FBQztRQUNyRCxNQUFNLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDdEIsQ0FBQztJQUVPLEtBQUs7UUFDWCxPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDaEMsQ0FBQztJQUdELEtBQUssQ0FBQyxLQUFLO1FBQ1QsSUFBSSxJQUFJLENBQUMsUUFBUSxFQUFFO1lBQ2pCLE1BQU0sSUFBSSxLQUFLLENBQUMsNkJBQTZCLENBQUMsQ0FBQztTQUNoRDtRQUNELElBQUksSUFBSSxDQUFDLFFBQVEsRUFBRTtZQUNqQixJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ3RCLElBQUksQ0FBQyxRQUFRLEdBQUcsS0FBSyxDQUFDLENBQUM7U0FDeEI7UUFDRCxNQUFNLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsU0FBUyxJQUFJLENBQUMsUUFBUSxRQUFRLENBQUMsQ0FBQyxDQUFDO1FBQ3hFLE1BQU0sSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1FBQ25CLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDO0lBQ3ZCLENBQUM7Q0FDRiJ9