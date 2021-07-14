import { ServerRequest  } from "https://deno.land/std/http/server.ts";
import { Static } from "./util/static.ts";

export const SUCCESS = {status: 200, headers: {"Content-Type": "text/html" }};
export const SUCCESS_JSON = {status: 200, headers: {"Content-Type": "application/json" }};

interface Callback {
  (e:ServerRequest): Promise<ServerResponse>;
}

interface Routes {
    [name:string]: Callback
}

interface Head{
  status: number,
  headers: Record<string, string>
}

interface ServerResponse{
  body: string,
  head: Head
}



export class Controller{

  routes:Routes;

  constructor(routes:Routes={}){
    this.routes = routes;
  }

  add(key:string, callback:Callback){
    this.routes[key] = callback;
  }

  async route(key:string, r:ServerRequest ):Promise<ServerResponse>{
    let path = key.split("?")[0];
    path = path !== "/" ? path : "/index.html";
    const full_key = r.method + " " + path;


    if (this.routes.hasOwnProperty(full_key)){
      return await this.routes[full_key](r);
    }
    
    const response = (new Static("./static")).read(path);
    if(response != undefined){
      return response;
    }
    
    return {body:"404 Not Found", head:{status: 404, headers: {"Content-Type": "text/html" }}}
  }

}
