document.addEventListener("DOMContentLoaded",()=>{


  const message = document.getElementById("message");
  const send = document.getElementById("send");

  message.focus();

  function send_message(){
    const urlParams = new URLSearchParams(window.location.search.slice(1));
      
    const data = {
      message_text: message.value, 
      email:urlParams.get("email")
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
    output.push(`
    <div>
      <small>${email}:</small> 
      ${m.message_text}<br>
      <small>${when}</small>
    </div>
    `);
  }
  list.innerHTML = output.join("\n");
  list.scrollTop = list.scrollHeight;
}

//FETCH IMMEDIATELY
getData("/api/v1/messages/").then(updateList);

});
