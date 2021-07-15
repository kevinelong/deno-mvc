import { Controller, SUCCESS, SUCCESS_JSON } from "../../app_framework/controller.ts";import { messages_model } from "../models/messages_model.ts";
import { ServerRequest  } from "https://deno.land/std/http/server.ts";
import { MultipartReader } from "https://deno.land/std/mime/mod.ts";
import {show_message} from "../views/messages_view.ts";

export class MessagesController extends Controller{
  constructor(){
    super();

    async function validate(e:ServerRequest){
      console.log(e);
      const contentType = e.headers.get("content-type");
      console.log("contentType",contentType)
      const text = (new TextDecoder()).decode(await Deno.readAll(e.body));
      console.log(text);
      let values:Record<string,string>={};
      text.split("&").map((pair)=>{
        const parts = pair.split("=");
        values[parts[0]]=parts[1];
      })
      let destination = "/chat.html?email="+values["login"];
      //TODO validate email 
      return { body: "", head: { status:302, headers:{ Location: destination } } };
    }
    this.add("POST /validate/", validate);

    async function messages_view(e:ServerRequest){
      return {body: messages_model.read().map(show_message).join("\n\n"), head: SUCCESS };
    }
    this.add("GET /messages_view/", messages_view);

    async function api_messages(e:ServerRequest){
      return{body:JSON.stringify(messages_model.read()), head:SUCCESS_JSON};
    }
    this.add("GET /api/v1/messages/", api_messages);

    async function api_message_create(e:ServerRequest){
      const decoder = new TextDecoder();
      const bodyContents = await Deno.readAll(e.body);
      const data = JSON.parse(decoder.decode(bodyContents));

      console.log(data);
      messages_model.create(data);

      // return (e);
      return{body:JSON.stringify(messages_model.read()), head:SUCCESS_JSON};
    }
    this.add("POST /api/v1/messages/", api_message_create);

  }
}
