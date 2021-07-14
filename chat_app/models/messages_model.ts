import { Model } from "../../app_framework/model.ts";

/* MESSAGES MODEL */

export const messages_model =  new Model("demo.db", "messages", [
  {field_name:"id", field_type:"INTEGER PRIMARY KEY AUTOINCREMENT"},
  {field_name:"email", field_type:"text"},
  {field_name:"message_text", field_type:"text"},
  {field_name:"time_created", field_type:"DATETIME DEFAULT CURRENT_TIMESTAMP"},
]);

messages_model.create({email:"kevinelong@gmail.com", message_text:"Greetings and Salutations!"});
messages_model.create({email:"dude@example.com", message_text:"Wassup!?"});
