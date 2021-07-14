import { View } from "../../app_framework/view.ts";


/* MESSAGES VIEW */

export const message_view = new View("<h1>{ message_text }</h1>\n<b>{ email }</b> <i>{ time_created }</i>");
export const show_message = (d:object)=>message_view.get(d);
