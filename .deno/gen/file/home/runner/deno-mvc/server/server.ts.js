import { serve } from "https://deno.land/std@0.100.0/http/server.ts";
import { routes } from "./routes.ts";
export default class MVCServer {
    constructor() {
    }
    serve() {
        (async () => {
            const get_path = (url) => url.replace(new RegExp("^[^#]*?://.*?(/.*)$"), '$1');
            const s = serve({ port: 8000 });
            for await (const r of s) {
                const output = routes.route(get_path(r.url), r);
                console.log(output.body);
                r.respond({ status: output.head.status, body: output.body, headers: new Headers(output.head.headers) });
            }
        })();
    }
    get_path(url) {
        return url.replace(new RegExp("^[^#]*?://.*?(/.*)$"), '$1');
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VydmVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsic2VydmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUNyRSxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sYUFBYSxDQUFDO0FBSXJDLE1BQU0sQ0FBQyxPQUFPLE9BQU8sU0FBUztJQUM1QjtJQUVBLENBQUM7SUFDRCxLQUFLO1FBQ0gsQ0FBQyxLQUFLLElBQUcsRUFBRTtZQUNULE1BQU0sUUFBUSxHQUFHLENBQUMsR0FBVSxFQUFFLEVBQUUsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksTUFBTSxDQUFDLHFCQUFxQixDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDdEYsTUFBTSxDQUFDLEdBQUcsS0FBSyxDQUFDLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7WUFFaEMsSUFBSSxLQUFLLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFO2dCQUN2QixNQUFNLE1BQU0sR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBQ2hELE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUN6QixDQUFDLENBQUMsT0FBTyxDQUFDLEVBQUMsTUFBTSxFQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLElBQUksRUFBQyxNQUFNLENBQUMsSUFBSSxFQUFFLE9BQU8sRUFBQyxJQUFJLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFDLENBQUMsQ0FBQzthQUNwRztRQUVILENBQUMsQ0FBQyxFQUFFLENBQUM7SUFDUCxDQUFDO0lBRUQsUUFBUSxDQUFFLEdBQVU7UUFDbEIsT0FBTyxHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksTUFBTSxDQUFDLHFCQUFxQixDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDOUQsQ0FBQztDQUNGIn0=