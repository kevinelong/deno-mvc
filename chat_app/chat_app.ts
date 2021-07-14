import { App } from "../app_framework/app.ts";
import { MessagesController } from "./controllers/messages_controller.ts";

export class ChatApp extends App{
  constructor(){
    super(new MessagesController());
  }
}
