import { ServerRequest  } from "https://deno.land/std@0.100.0/http/server.ts";
import { DB } from "https://deno.land/x/sqlite/mod.ts";

import { Model } from "./mvc/model.ts";
import { View } from "./mvc/view.ts";
import { Controller } from "./mvc/controller.ts";

interface Head{
  status: number,
  headers: Record<string, string>
}
interface ServerResponse{
  body: string,
  head: Head
}

/* MODEL */

const messages_model =  new Model("demo.db", "messages", [
  {field_name:"id", field_type:"INTEGER PRIMARY KEY AUTOINCREMENT"},
  {field_name:"email", field_type:"text"},
  {field_name:"message_text", field_type:"text"},
  {field_name:"time_created", field_type:"DATETIME DEFAULT CURRENT_TIMESTAMP"},
]);

messages_model.create({email:"kevinelong@gmail.com", message_text:"Greetings and Salutations!"});
messages_model.create({email:"dude@example.com", message_text:"Wassup!?"});


/* VIEW */

const message_view = new View("<h1>{ message_text }</h1>\n<b>{ email }</b> <i>{ time_created }</i>");
const show_message = (d:object)=>message_view.get(d);


/* CONTROLLER/ROUTES */

const SUCCESS = {status: 200, headers: {"Content-Type": "text/html" }};
const SUCCESS_JSON = {status: 200, headers: {"Content-Type": "application/json" }};


export const routes = new Controller({
  "GET /messages/" : (e:ServerRequest)=>{return{body:messages_model.read().map(show_message).join("\n\n"), head:SUCCESS};},
  "POST /messages/" : (e:ServerRequest)=>{return{body:JSON.stringify(messages_model.read()), head:SUCCESS_JSON};},
});

routes.add("GET /foo/", (e:ServerRequest)=> {return{body:`bar`, head:SUCCESS}});
