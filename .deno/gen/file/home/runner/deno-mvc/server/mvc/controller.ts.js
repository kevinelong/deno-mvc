import { Static } from "./util/static.ts";
export class Controller {
    routes;
    constructor(routes = {}) {
        this.routes = routes;
    }
    add(key, callback) {
        this.routes[key] = callback;
    }
    route(key, r) {
        const path = key !== "/" ? key : "/index.html";
        const full_key = r.method + " " + path;
        if (this.routes.hasOwnProperty(full_key)) {
            return this.routes[full_key](r);
        }
        const response = (new Static("./client_static")).read(path);
        if (response != undefined) {
            return response;
        }
        return { body: "404 Not Found", head: { status: 404, headers: { "Content-Type": "text/html" } } };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udHJvbGxlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImNvbnRyb2xsZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQ0EsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLGtCQUFrQixDQUFDO0FBcUIxQyxNQUFNLE9BQU8sVUFBVTtJQUVyQixNQUFNLENBQVE7SUFFZCxZQUFZLFNBQWMsRUFBRTtRQUMxQixJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztJQUN2QixDQUFDO0lBRUQsR0FBRyxDQUFDLEdBQVUsRUFBRSxRQUFpQjtRQUMvQixJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxHQUFHLFFBQVEsQ0FBQztJQUM5QixDQUFDO0lBR0QsS0FBSyxDQUFDLEdBQVUsRUFBRSxDQUFlO1FBQy9CLE1BQU0sSUFBSSxHQUFHLEdBQUcsS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDO1FBQy9DLE1BQU0sUUFBUSxHQUFHLENBQUMsQ0FBQyxNQUFNLEdBQUcsR0FBRyxHQUFHLElBQUksQ0FBQztRQUV2QyxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsY0FBYyxDQUFDLFFBQVEsQ0FBQyxFQUFDO1lBQ3ZDLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUNqQztRQUVELE1BQU0sUUFBUSxHQUFHLENBQUMsSUFBSSxNQUFNLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUM1RCxJQUFHLFFBQVEsSUFBSSxTQUFTLEVBQUM7WUFDdkIsT0FBTyxRQUFRLENBQUM7U0FDakI7UUFFRCxPQUFPLEVBQUMsSUFBSSxFQUFDLGVBQWUsRUFBRSxJQUFJLEVBQUMsRUFBQyxNQUFNLEVBQUUsR0FBRyxFQUFFLE9BQU8sRUFBRSxFQUFDLGNBQWMsRUFBRSxXQUFXLEVBQUUsRUFBQyxFQUFDLENBQUE7SUFDNUYsQ0FBQztDQUVGIn0=