import { serve, ServerRequest  } from "https://deno.land/std/http/server.ts";

import { Controller } from "./controller.ts";

interface Head{
  status: number,
  headers: Record<string, string>
}

interface ServerResponse{
  body: string,
  head: Head
}

export class App{
  parameters: Record<any, any>;
  controller: Controller;

  constructor(controller:Controller, parameters: Record<any, any> = {port:8000}){
    this.controller = controller;
    this.parameters = parameters;
  }

  start(){
    (async ()=>{

      const get_path = (url:string) => url.replace(new RegExp("^[^#]*?://.*?(/.*)$"), '$1');
      const s = serve({ port: this.parameters.port });

      for await (const r of s) {
        const output = await this.controller.route(get_path(r.url), r);
        r.respond({status:output.head.status, body:output.body, headers:new Headers(output.head.headers)});
      }

    })();
  }

  get_path (url:string){
    return url.replace(new RegExp("^[^#]*?://.*?(/.*)$"), '$1');
  }
  
}
