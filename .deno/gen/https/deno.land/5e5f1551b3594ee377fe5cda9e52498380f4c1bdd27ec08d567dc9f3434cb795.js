import { globToRegExp, isAbsolute, isGlob, joinGlobs, normalize, SEP_PATTERN, } from "../path/mod.ts";
import { _createWalkEntry, _createWalkEntrySync, walk, walkSync, } from "./walk.ts";
import { assert } from "../_util/assert.ts";
import { isWindows } from "../_util/os.ts";
function split(path) {
    const s = SEP_PATTERN.source;
    const segments = path
        .replace(new RegExp(`^${s}|${s}$`, "g"), "")
        .split(SEP_PATTERN);
    const isAbsolute_ = isAbsolute(path);
    return {
        segments,
        isAbsolute: isAbsolute_,
        hasTrailingSep: !!path.match(new RegExp(`${s}$`)),
        winRoot: isWindows && isAbsolute_ ? segments.shift() : undefined,
    };
}
function throwUnlessNotFound(error) {
    if (!(error instanceof Deno.errors.NotFound)) {
        throw error;
    }
}
function comparePath(a, b) {
    if (a.path < b.path)
        return -1;
    if (a.path > b.path)
        return 1;
    return 0;
}
export async function* expandGlob(glob, { root = Deno.cwd(), exclude = [], includeDirs = true, extended = false, globstar = false, caseInsensitive, } = {}) {
    const globOptions = { extended, globstar, caseInsensitive };
    const absRoot = isAbsolute(root)
        ? normalize(root)
        : joinGlobs([Deno.cwd(), root], globOptions);
    const resolveFromRoot = (path) => isAbsolute(path)
        ? normalize(path)
        : joinGlobs([absRoot, path], globOptions);
    const excludePatterns = exclude
        .map(resolveFromRoot)
        .map((s) => globToRegExp(s, globOptions));
    const shouldInclude = (path) => !excludePatterns.some((p) => !!path.match(p));
    const { segments, hasTrailingSep, winRoot } = split(resolveFromRoot(glob));
    let fixedRoot = winRoot != undefined ? winRoot : "/";
    while (segments.length > 0 && !isGlob(segments[0])) {
        const seg = segments.shift();
        assert(seg != null);
        fixedRoot = joinGlobs([fixedRoot, seg], globOptions);
    }
    let fixedRootInfo;
    try {
        fixedRootInfo = await _createWalkEntry(fixedRoot);
    }
    catch (error) {
        return throwUnlessNotFound(error);
    }
    async function* advanceMatch(walkInfo, globSegment) {
        if (!walkInfo.isDirectory) {
            return;
        }
        else if (globSegment == "..") {
            const parentPath = joinGlobs([walkInfo.path, ".."], globOptions);
            try {
                if (shouldInclude(parentPath)) {
                    return yield await _createWalkEntry(parentPath);
                }
            }
            catch (error) {
                throwUnlessNotFound(error);
            }
            return;
        }
        else if (globSegment == "**") {
            return yield* walk(walkInfo.path, {
                includeFiles: false,
                skip: excludePatterns,
            });
        }
        yield* walk(walkInfo.path, {
            maxDepth: 1,
            match: [
                globToRegExp(joinGlobs([walkInfo.path, globSegment], globOptions), globOptions),
            ],
            skip: excludePatterns,
        });
    }
    let currentMatches = [fixedRootInfo];
    for (const segment of segments) {
        const nextMatchMap = new Map();
        for (const currentMatch of currentMatches) {
            for await (const nextMatch of advanceMatch(currentMatch, segment)) {
                nextMatchMap.set(nextMatch.path, nextMatch);
            }
        }
        currentMatches = [...nextMatchMap.values()].sort(comparePath);
    }
    if (hasTrailingSep) {
        currentMatches = currentMatches.filter((entry) => entry.isDirectory);
    }
    if (!includeDirs) {
        currentMatches = currentMatches.filter((entry) => !entry.isDirectory);
    }
    yield* currentMatches;
}
export function* expandGlobSync(glob, { root = Deno.cwd(), exclude = [], includeDirs = true, extended = false, globstar = false, caseInsensitive, } = {}) {
    const globOptions = { extended, globstar, caseInsensitive };
    const absRoot = isAbsolute(root)
        ? normalize(root)
        : joinGlobs([Deno.cwd(), root], globOptions);
    const resolveFromRoot = (path) => isAbsolute(path)
        ? normalize(path)
        : joinGlobs([absRoot, path], globOptions);
    const excludePatterns = exclude
        .map(resolveFromRoot)
        .map((s) => globToRegExp(s, globOptions));
    const shouldInclude = (path) => !excludePatterns.some((p) => !!path.match(p));
    const { segments, hasTrailingSep, winRoot } = split(resolveFromRoot(glob));
    let fixedRoot = winRoot != undefined ? winRoot : "/";
    while (segments.length > 0 && !isGlob(segments[0])) {
        const seg = segments.shift();
        assert(seg != null);
        fixedRoot = joinGlobs([fixedRoot, seg], globOptions);
    }
    let fixedRootInfo;
    try {
        fixedRootInfo = _createWalkEntrySync(fixedRoot);
    }
    catch (error) {
        return throwUnlessNotFound(error);
    }
    function* advanceMatch(walkInfo, globSegment) {
        if (!walkInfo.isDirectory) {
            return;
        }
        else if (globSegment == "..") {
            const parentPath = joinGlobs([walkInfo.path, ".."], globOptions);
            try {
                if (shouldInclude(parentPath)) {
                    return yield _createWalkEntrySync(parentPath);
                }
            }
            catch (error) {
                throwUnlessNotFound(error);
            }
            return;
        }
        else if (globSegment == "**") {
            return yield* walkSync(walkInfo.path, {
                includeFiles: false,
                skip: excludePatterns,
            });
        }
        yield* walkSync(walkInfo.path, {
            maxDepth: 1,
            match: [
                globToRegExp(joinGlobs([walkInfo.path, globSegment], globOptions), globOptions),
            ],
            skip: excludePatterns,
        });
    }
    let currentMatches = [fixedRootInfo];
    for (const segment of segments) {
        const nextMatchMap = new Map();
        for (const currentMatch of currentMatches) {
            for (const nextMatch of advanceMatch(currentMatch, segment)) {
                nextMatchMap.set(nextMatch.path, nextMatch);
            }
        }
        currentMatches = [...nextMatchMap.values()].sort(comparePath);
    }
    if (hasTrailingSep) {
        currentMatches = currentMatches.filter((entry) => entry.isDirectory);
    }
    if (!includeDirs) {
        currentMatches = currentMatches.filter((entry) => !entry.isDirectory);
    }
    yield* currentMatches;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhwYW5kX2dsb2IuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJleHBhbmRfZ2xvYi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFDQSxPQUFPLEVBRUwsWUFBWSxFQUNaLFVBQVUsRUFDVixNQUFNLEVBQ04sU0FBUyxFQUNULFNBQVMsRUFDVCxXQUFXLEdBQ1osTUFBTSxnQkFBZ0IsQ0FBQztBQUN4QixPQUFPLEVBQ0wsZ0JBQWdCLEVBQ2hCLG9CQUFvQixFQUNwQixJQUFJLEVBRUosUUFBUSxHQUNULE1BQU0sV0FBVyxDQUFDO0FBQ25CLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM1QyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sZ0JBQWdCLENBQUM7QUFnQjNDLFNBQVMsS0FBSyxDQUFDLElBQVk7SUFDekIsTUFBTSxDQUFDLEdBQUcsV0FBVyxDQUFDLE1BQU0sQ0FBQztJQUM3QixNQUFNLFFBQVEsR0FBRyxJQUFJO1NBQ2xCLE9BQU8sQ0FBQyxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsRUFBRSxFQUFFLENBQUM7U0FDM0MsS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFDO0lBQ3RCLE1BQU0sV0FBVyxHQUFHLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNyQyxPQUFPO1FBQ0wsUUFBUTtRQUNSLFVBQVUsRUFBRSxXQUFXO1FBQ3ZCLGNBQWMsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLE1BQU0sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDakQsT0FBTyxFQUFFLFNBQVMsSUFBSSxXQUFXLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUMsU0FBUztLQUNqRSxDQUFDO0FBQ0osQ0FBQztBQUVELFNBQVMsbUJBQW1CLENBQUMsS0FBWTtJQUN2QyxJQUFJLENBQUMsQ0FBQyxL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