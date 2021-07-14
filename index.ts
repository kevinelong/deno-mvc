import { ChatApp } from "./chat_app/chat_app.ts"

const s = new ChatApp();
s.start();

/* HOW MUCH CODE IS THERE AND WHERE IS IT?


~/deno-mvc/chat_app$ find . -name '*' | xargs wc -l
      7 ./views/messages_view.ts
     13 ./models/messages_model.ts
     41 ./controllers/messages_controller.ts
      8 ./chat_app.ts
     69 total

~/deno-mvc/static$ find . -name '*' | xargs wc -l
      2 ./js/login.js
     83 ./js/chat.js
     30 ./css/main.css
     17 ./css/login.css
     22 ./css/index.css
     41 ./css/chat.css
     12 ./index.html
     13 ./login.html
     17 ./chat.html
    237 total */

//SERVER
/*
 find . -name '*ts' | xargs wc -l
  35 ./util/static.ts
  47 ./model.ts
  16 ./view.ts
  55 ./controller.ts
  42 ./app.ts
 195 total
 */