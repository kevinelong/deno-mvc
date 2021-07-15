import { ChatApp } from "./chat_app/chat_app.ts"

const s = new ChatApp();
s.start();

/* HOW MUCH CODE IS THERE AND WHERE IS IT? 


SERVER

~/deno-mvc/chat_app$ find . -name '*' |
      7 ./views/messages_view.ts
     13 ./models/messages_model.ts
     51 ./controllers/messages_controller.ts
      8 ./chat_app.ts
     79 total


STATIC 

~/deno-mvc/static$ find . -name '*' | xargs wc -l
find . -name '*' | xargs wc -l
      2 ./js/login.js
     86 ./js/chat.js
     30 ./css/main.css
     17 ./css/login.css
     22 ./css/index.css
     41 ./css/chat.css
     12 ./index.html
     17 ./chat.html
     14 ./login.html
    241 total


APPFRAMEWORK

      0 ./util
     35 ./util/static.ts
     47 ./model.ts
     16 ./view.ts
     42 ./app.ts
     57 ./controller.ts
    197 total

*/