import { App } from "../app_framework/app.ts";
import { MessagesController } from "./controllers/messages_controller.ts";
export class ChatApp extends App {
    constructor() {
        super(new MessagesController());
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdF9hcHAuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJjaGF0X2FwcC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFDOUMsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFFMUUsTUFBTSxPQUFPLE9BQVEsU0FBUSxHQUFHO0lBQzlCO1FBQ0UsS0FBSyxDQUFDLElBQUksa0JBQWtCLEVBQUUsQ0FBQyxDQUFDO0lBQ2xDLENBQUM7Q0FDRiJ9