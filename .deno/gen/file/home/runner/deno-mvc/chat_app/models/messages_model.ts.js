import { Model } from "../../app_framework/model.ts";
export const messages_model = new Model("demo.db", "messages", [
    { field_name: "id", field_type: "INTEGER PRIMARY KEY AUTOINCREMENT" },
    { field_name: "email", field_type: "text" },
    { field_name: "message_text", field_type: "text" },
    { field_name: "time_created", field_type: "DATETIME DEFAULT CURRENT_TIMESTAMP" },
]);
messages_model.create({ email: "kevinelong@gmail.com", message_text: "Greetings and Salutations!" });
messages_model.create({ email: "dude@example.com", message_text: "Wassup!?" });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWVzc2FnZXNfbW9kZWwuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJtZXNzYWdlc19tb2RlbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFJckQsTUFBTSxDQUFDLE1BQU0sY0FBYyxHQUFJLElBQUksS0FBSyxDQUFDLFNBQVMsRUFBRSxVQUFVLEVBQUU7SUFDOUQsRUFBQyxVQUFVLEVBQUMsSUFBSSxFQUFFLFVBQVUsRUFBQyxtQ0FBbUMsRUFBQztJQUNqRSxFQUFDLFVBQVUsRUFBQyxPQUFPLEVBQUUsVUFBVSxFQUFDLE1BQU0sRUFBQztJQUN2QyxFQUFDLFVBQVUsRUFBQyxjQUFjLEVBQUUsVUFBVSxFQUFDLE1BQU0sRUFBQztJQUM5QyxFQUFDLFVBQVUsRUFBQyxjQUFjLEVBQUUsVUFBVSxFQUFDLG9DQUFvQyxFQUFDO0NBQzdFLENBQUMsQ0FBQztBQUVILGNBQWMsQ0FBQyxNQUFNLENBQUMsRUFBQyxLQUFLLEVBQUMsc0JBQXNCLEVBQUUsWUFBWSxFQUFDLDRCQUE0QixFQUFDLENBQUMsQ0FBQztBQUNqRyxjQUFjLENBQUMsTUFBTSxDQUFDLEVBQUMsS0FBSyxFQUFDLGtCQUFrQixFQUFFLFlBQVksRUFBQyxVQUFVLEVBQUMsQ0FBQyxDQUFDIn0=