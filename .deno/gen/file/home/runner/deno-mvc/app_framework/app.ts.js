import { serve } from "https://deno.land/std/http/server.ts";
export class App {
    parameters;
    controller;
    constructor(controller, parameters = { port: 8000 }) {
        this.controller = controller;
        this.parameters = parameters;
    }
    start() {
        (async () => {
            const get_path = (url) => url.replace(new RegExp("^[^#]*?://.*?(/.*)$"), '$1');
            const s = serve({ port: this.parameters.port });
            for await (const r of s) {
                const output = await this.controller.route(get_path(r.url), r);
                r.respond({ status: output.head.status, body: output.body, headers: new Headers(output.head.headers) });
            }
        })();
    }
    get_path(url) {
        return url.replace(new RegExp("^[^#]*?://.*?(/.*)$"), '$1');
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBwLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYXBwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBRSxLQUFLLEVBQWtCLE1BQU0sc0NBQXNDLENBQUM7QUFjN0UsTUFBTSxPQUFPLEdBQUc7SUFDZCxVQUFVLENBQW1CO0lBQzdCLFVBQVUsQ0FBYTtJQUV2QixZQUFZLFVBQXFCLEVBQUUsYUFBK0IsRUFBQyxJQUFJLEVBQUMsSUFBSSxFQUFDO1FBQzNFLElBQUksQ0FBQyxVQUFVLEdBQUcsVUFBVSxDQUFDO1FBQzdCLElBQUksQ0FBQyxVQUFVLEdBQUcsVUFBVSxDQUFDO0lBQy9CLENBQUM7SUFFRCxLQUFLO1FBQ0gsQ0FBQyxLQUFLLElBQUcsRUFBRTtZQUVULE1BQU0sUUFBUSxHQUFHLENBQUMsR0FBVSxFQUFFLEVBQUUsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksTUFBTSxDQUFDLHFCQUFxQixDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDdEYsTUFBTSxDQUFDLEdBQUcsS0FBSyxDQUFDLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQztZQUVoRCxJQUFJLEtBQUssRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUU7Z0JBQ3ZCLE1BQU0sTUFBTSxHQUFHLE1BQU0sSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFDL0QsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxFQUFDLE1BQU0sRUFBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxPQUFPLEVBQUMsSUFBSSxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBQyxDQUFDLENBQUM7YUFDcEc7UUFFSCxDQUFDLENBQUMsRUFBRSxDQUFDO0lBQ1AsQ0FBQztJQUVELFFBQVEsQ0FBRSxHQUFVO1FBQ2xCLE9BQU8sR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLE1BQU0sQ0FBQyxxQkFBcUIsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQzlELENBQUM7Q0FFRiJ9