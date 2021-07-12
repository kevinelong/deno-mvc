import { ServerRequest  } from "https://deno.land/std@0.100.0/http/server.ts";
import { Static } from "./util/static.ts";

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

interface Callback {
  (e:ServerRequest): ServerResponse;
}


export class Controller{

  routes:Routes;

  constructor(routes:Routes){
    this.routes = routes;
  }

  add(key:string, callback:Callback){
    this.routes[key] = callback;
  }


  route(key:string, r:ServerRequest ):ServerResponse{
    const path = key !== "/" ? key : "/index.html";
    const full_key = r.method + " " + path;

    if (this.routes.hasOwnProperty(full_key)){
      return this.routes[full_key](r);
    }
    
    const response = (new Static("./client_static")).read(path);
    if(response != undefined){
      return response;
    }
    
    const NOT_FOUND = {status: 404, headers: {"Content-Type": "text/html" }};
    return {body:"404 Not Found", head:NOT_FOUND}
  }

}
