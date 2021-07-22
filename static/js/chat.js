document.addEventListener("DOMContentLoaded",()=>{


  const message = document.getElementById("message");
  const send = document.getElementById("send");

  message.focus();

  const urlParams = new URLSearchParams(window.location.search.slice(1));
    
  function send_message(){

    const data = {
      message_text: message.value, 
      email: urlParams.get("email")
    };
    postData("/api/v1/messages/", data).then(updateList);
  }

  function clear_input(){
    message.value='';
  }

  send.onclick = () => {
    send_message();
    clear_input();
  }

  const ENTER = 13;

  message.onkeyup = (event) => {
    if(ENTER === event.keyCode){
            send.click()
    }
  }

async function getData(url = '') {
  const response = await fetch(url, {
    method: 'GET', 
    mode: 'cors', 
    cache: 'no-cache',
    credentials: 'same-origin', 
    redirect: 'follow',
    referrerPolicy: 'no-referrer'
  });
  return response.json(); 
}

async function postData(url = '', data = {}) {
  const response = await fetch(url, {
    method: 'POST', 
    mode: 'cors', 
    cache: 'no-cache',
    credentials: 'same-origin', 
    headers: {'Content-Type': 'application/json'},
    redirect: 'follow',
    referrerPolicy: 'no-referrer', 
    body: JSON.stringify(data) 
  });
  return response.json(); 
}


function updateList(data){
 console.log(data); // JSON data parsed by `data.json()` call
  list.innerHTML = "";
  let output = [];
  for(let i=0;i<data.length;i++){
    const m = data[i];
    const email = m.email.split("@")[0]; //REMOVE DOMAIN
    const when = m.time_created.split(" ")[1]; //REMOVE DATE

    //GRAVATAR
    const hash = CryptoJS.MD5(m.email);
    const md5 = hash.toString(CryptoJS.enc.Hex)
    const src=`https://secure.gravatar.com/avatar/${md5}?s=64`

    output.push(`
    <div class="message">
      <img src="${src}">
      <div style="display:inline-block">
        <small>${email}:</small> 
        ${m.message_text}<br>
        <small>${when}</small>
        </div>
    </div>
    `);
  }
  list.innerHTML = output.join("\n");
  list.scrollTop = list.scrollHeight;
}

function dataLoop(){
  getData("/api/v1/messages/").then(updateList);
  setTimeout(dataLoop,9999)
}
//FETCH IMMEDIATELY
dataLoop();
});
