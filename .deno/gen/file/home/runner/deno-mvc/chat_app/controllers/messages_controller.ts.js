import { Controller, SUCCESS, SUCCESS_JSON } from "../../app_framework/controller.ts";
import { messages_model } from "../models/messages_model.ts";
import { show_message } from "../views/messages_view.ts";
export class MessagesController extends Controller {
    constructor() {
        super();
        async function validate(e) {
            console.log(e);
            const contentType = e.headers.get("content-type");
            console.log("contentType", contentType);
            const text = (new TextDecoder()).decode(await Deno.readAll(e.body));
            console.log(text);
            let values = {};
            text.split("&").map((pair) => {
                const parts = pair.split("=");
                values[parts[0]] = parts[1];
            });
            let destination = "/chat.html?email=" + values["login"];
            return { body: "", head: { status: 302, headers: { Location: destination } } };
        }
        this.add("POST /validate/", validate);
        async function messages_view(e) {
            return { body: messages_model.read().map(show_message).join("\n\n"), head: SUCCESS };
        }
        this.add("GET /messages_view/", validate);
        async function api_messages(e) {
            return { body: JSON.stringify(messages_model.read()), head: SUCCESS_JSON };
        }
        this.add("GET /api/v1/messages/", api_messages);
        async function api_message_create(e) {
            const decoder = new TextDecoder();
            const bodyContents = await Deno.readAll(e.body);
            const data = JSON.parse(decoder.decode(bodyContents));
            console.log(data);
            messages_model.create(data);
            return { body: JSON.stringify(messages_model.read()), head: SUCCESS_JSON };
        }
        this.add("POST /api/v1/messages/", api_message_create);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWVzc2FnZXNfY29udHJvbGxlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIm1lc3NhZ2VzX2NvbnRyb2xsZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFFLFVBQVUsRUFBRSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFBQSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFHbkosT0FBTyxFQUFDLFlBQVksRUFBQyxNQUFNLDJCQUEyQixDQUFDO0FBRXZELE1BQU0sT0FBTyxrQkFBbUIsU0FBUSxVQUFVO0lBQ2hEO1FBQ0UsS0FBSyxFQUFFLENBQUM7UUFFUixLQUFLLFVBQVUsUUFBUSxDQUFDLENBQWU7WUFDckMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNmLE1BQU0sV0FBVyxHQUFHLENBQUMsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxDQUFDO1lBQ2xELE9BQU8sQ0FBQyxHQUFHLENBQUMsYUFBYSxFQUFDLFdBQVcsQ0FBQyxDQUFBO1lBQ3RDLE1BQU0sSUFBSSxHQUFHLENBQUMsSUFBSSxXQUFXLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxNQUFNLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7WUFDcEUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUNsQixJQUFJLE1BQU0sR0FBdUIsRUFBRSxDQUFDO1lBQ3BDLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxFQUFDLEVBQUU7Z0JBQzFCLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQzlCLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDNUIsQ0FBQyxDQUFDLENBQUE7WUFDRixJQUFJLFdBQVcsR0FBRyxtQkFBbUIsR0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUM7WUFFdEQsT0FBTyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsSUFBSSxFQUFFLEVBQUUsTUFBTSxFQUFDLEdBQUcsRUFBRSxPQUFPLEVBQUMsRUFBRSxRQUFRLEVBQUUsV0FBVyxFQUFFLEVBQUUsRUFBRSxDQUFDO1FBQy9FLENBQUM7UUFDRCxJQUFJLENBQUMsR0FBRyxDQUFDLGlCQUFpQixFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBRXRDLEtBQUssVUFBVSxhQUFhLENBQUMsQ0FBZTtZQUMxQyxPQUFPLEVBQUMsSUFBSSxFQUFFLGNBQWMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsQ0FBQztRQUN0RixDQUFDO1FBQ0QsSUFBSSxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsRUFBRSxRQUFRLENBQUMsQ0FBQztRQUUxQyxLQUFLLFVBQVUsWUFBWSxDQUFDLENBQWU7WUFDekMsT0FBTSxFQUFDLElBQUksRUFBQyxJQUFJLENBQUMsU0FBUyxDQUFDLGNBQWMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBQyxZQUFZLEVBQUMsQ0FBQztRQUN4RSxDQUFDO1FBQ0QsSUFBSSxDQUFDLEdBQUcsQ0FBQyx1QkFBdUIsRUFBRSxZQUFZLENBQUMsQ0FBQztRQUVoRCxLQUFLLFVBQVUsa0JBQWtCLENBQUMsQ0FBZTtZQUMvQyxNQUFNLE9BQU8sR0FBRyxJQUFJLFdBQVcsRUFBRSxDQUFDO1lBQ2xDLE1BQU0sWUFBWSxHQUFHLE1BQU0sSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDaEQsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUM7WUFFdEQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUNsQixjQUFjLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBRzVCLE9BQU0sRUFBQyxJQUFJLEVBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxjQUFjLENBQUMsSUFBSSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUMsWUFBWSxFQUFDLENBQUM7UUFDeEUsQ0FBQztRQUNELElBQUksQ0FBQyxHQUFHLENBQUMsd0JBQXdCLEVBQUUsa0JBQWtCLENBQUMsQ0FBQztJQUV6RCxDQUFDO0NBQ0YifQ==