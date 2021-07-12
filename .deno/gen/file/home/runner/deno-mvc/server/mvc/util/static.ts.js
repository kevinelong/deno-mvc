import { existsSync } from "https://deno.land/std/fs/mod.ts";
export const readFile = (filename) => {
    const decoder = new TextDecoder();
    return decoder.decode(Deno.readFileSync(filename));
};
export class Static {
    root_path;
    constructor(root_path) {
        this.root_path = root_path;
    }
    read(path) {
        const filePath = this.root_path + path;
        console.log("Looking for", filePath);
        if (!existsSync(filePath)) {
            return undefined;
        }
        const fileSize = (Deno.statSync(filePath)).size;
        const text = readFile(filePath);
        const size_text = fileSize.toString();
        return {
            body: text,
            head: {
                status: 200,
                headers: {
                    'content-length': size_text
                }
            }
        };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhdGljLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsic3RhdGljLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBUyxVQUFVLEVBQUMsTUFBTSxpQ0FBaUMsQ0FBQztBQUVuRSxNQUFNLENBQUMsTUFBTSxRQUFRLEdBQUcsQ0FBQyxRQUFnQixFQUFFLEVBQUU7SUFDM0MsTUFBTSxPQUFPLEdBQUcsSUFBSSxXQUFXLEVBQUUsQ0FBQTtJQUNqQyxPQUFPLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFBO0FBQ3BELENBQUMsQ0FBQTtBQUVELE1BQU0sT0FBTyxNQUFNO0lBQ2pCLFNBQVMsQ0FBUTtJQUNqQixZQUFZLFNBQWdCO1FBQzFCLElBQUksQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFDO0lBQzdCLENBQUM7SUFDRCxJQUFJLENBQUMsSUFBVztRQUNkLE1BQU0sUUFBUSxHQUFFLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDO1FBRXRDLE9BQU8sQ0FBQyxHQUFHLENBQUMsYUFBYSxFQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ3BDLElBQUcsQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLEVBQUM7WUFDdkIsT0FBTyxTQUFTLENBQUM7U0FDbEI7UUFDRCxNQUFNLFFBQVEsR0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7UUFDOUMsTUFBTSxJQUFJLEdBQUcsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ2hDLE1BQU0sU0FBUyxHQUFHLFFBQVEsQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUN0QyxPQUFPO1lBQ0wsSUFBSSxFQUFDLElBQUk7WUFDVCxJQUFJLEVBQUM7Z0JBQ0gsTUFBTSxFQUFDLEdBQUc7Z0JBQ1YsT0FBTyxFQUFDO29CQUNOLGdCQUFnQixFQUFFLFNBQVM7aUJBQzVCO2FBQ0Y7U0FDRixDQUFDO0lBQ0osQ0FBQztDQUNGIn0=