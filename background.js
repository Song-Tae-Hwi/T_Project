var tabGroups = {};
var memberCheck = {};

var existingBeforeUsing={
  windowIds:[],
  tabIds:[],
};
var installed = false;

var windowCreated = false;
var justCreatedWindow;
var tabCreated = false;
var tabRemoved = false;
var hyperClick = false;

var copyNode;

var firstTabId;

function unique() {
  // 처음 실행되는 경우
  firstTabId = firstTabId - 1;
  if (firstTabId < 0) {
    firstTabId = Number.MAX_SAFE_INTEGER;
  }
  return firstTabId;
}

function renameProperty(object, oldKey, newKey) {
  if (object.hasOwnProperty(oldKey)) {
    Object.defineProperty(object, newKey, Object.getOwnPropertyDescriptor(object, oldKey));
    delete object[oldKey];
  }
}

function removeAllWindows(){
  chrome.windows.getAll({}, function(windows) {//windows는 배열
    windows.forEach(function(window) {
      chrome.windows.remove(window.id);
    });
  });
  tabGroups={};
  memberCheck={};
}

class TreeNode {
  constructor(tabId) {
    this.tabId = tabId;
    this.urls=[];//여기 url들이 담긴다.
    this.root = false;
    this.children = [];//배열의 각 원소는 자식의 주소이다. push와 pop으로 가변 크기
  }

  // 노드에 자식을 추가합니다.
  addChild(node) {
    this.children.push(node);
  }
  isRoot(){
    this.root = true;
  }

}

chrome.runtime.onInstalled.addListener(function(details) {
  if (details.reason === 'install') {
    chrome.tabs.create({ url: 'welcome.html' });
  }
  //이 부분에서 chrome.windows.getAll()이 비동기적으로 실행되기 때문에 tabs.onCreated와 tabs.onActivated 이벤트가 먼저 발생한다. 
  //설치 당시에 이미 열려있는 탭에 대해 delete시 오류 발생하지 않게 하기 위해 tab의 id들을 얻는다.
  chrome.windows.getAll({ populate: true }, (windows) => {
    windows.forEach((window) => {
      existingBeforeUsing.windowIds.push(window.id); // Save window id
      window.tabs.forEach((tab) => {
        existingBeforeUsing.tabIds.push(tab.id); // Save tab id
      });
    });
    installed = true;
  });

  
});

//원리가 어떤 창 먼저 만들고 기존 창에서 탭 detach 한 뒤, 생성한 창에 attach하는 원리임
//역으로 붙일땐 창에서 detach 하고 창에 붙인다
chrome.tabs.onDetached.addListener(function(tabId, detachInfo){
  console.log("chrome.tabs.onDetached");

  //현재 떼는 탭 노드만 가져온다.
  copyNode = new TreeNode(tabId);
  copyNode.urls = memberCheck[tabId][tabId].urls;
  copyNode.isRoot();

  let delTab = unique();
  renameProperty(memberCheck[tabId], tabId, delTab);
  


})


chrome.tabs.onAttached.addListener(function(tabId, attachInfo){
  
  if(windowCreated){
    delete tabGroups[attachInfo.newWindowId];
    windowCreated = false;
  }
  

  if(!tabGroups[attachInfo.newWindowId]){
    console.log("새 창에 attach");

    tabGroups[attachInfo.newWindowId] = {activeTab:tabId};
    tabGroups[attachInfo.newWindowId][tabId] = copyNode;
    memberCheck[tabId] = tabGroups[attachInfo.newWindowId];
  }
  //기존 창에 붙이는 경우도 if문 실행되기 때문에 이전 실행된 if문으로 생긴거 삭제해야한다.

  else{
    console.log("기존 창에 attach");

    tabGroups[attachInfo.newWindowId].activeTab = tabId;
    tabGroups[attachInfo.newWindowId][tabId] = copyNode;
    memberCheck[tabId] = tabGroups[attachInfo.newWindowId];
  
  }
  
})


chrome.windows.onCreated.addListener(function(window){
  
  //처음 한 번만 실행되는 함수. 가장 처음 발생하는 window id 보다 작은 값을 설정하여 detach시나 delete 시 탭 자리에 unique한 기록을 가진다. 
  (function() {
    firstTabId = window.id;
  })();
  
  windowCreated = true;
  justCreatedWindow = window.id;

  tabGroups[window.id] = {activeTab:null};


},
{windowType : ["normal"]}
)


//탭이 생성될땐 트리의 노드를 만드는 코드가 있어야함.
chrome.tabs.onCreated.addListener(function (tab) {

  if(installed===true){
    tabCreated = true;
    console.log("탭 생성 Id: "+tab.id);
    memberCheck[tab.id] = tabGroups[tab.windowId];    
  }


});


chrome.tabs.onActivated.addListener((activeInfo) => {
  
  if(installed===true){
    memberCheck[activeInfo.tabId].activeTab = activeInfo.tabId;  
    console.log("액티브된 탭 Id: "+activeInfo.tabId);
  }

});

chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
  if(!existingBeforeUsing.tabIds.includes(tabId)){
    

    if(changeInfo.status === "complete"){ //update는 여러번 발생하는데, complete안하면, 아래 코드들 여러 번 실행된다.
      console.log("업데이트발생");
      if(windowCreated===true && tabCreated===true){ //창과 탭이 동시에 만들어진 경우 -> chrome 새로 시작, 새창으로 열기

        //chrome app 실행, 새 창 열기
        //탭id를 key로 가진 객체를 만듦
        tabGroups[tab.windowId][tab.id] = new TreeNode(tab.id);
        tabGroups[tab.windowId][tab.id].isRoot();
        
        memberCheck[tab.id] = tabGroups[tab.windowId];
        

      }else if(windowCreated===false && tabCreated===true){//창은 안생기고 탭만 생성되는 경우 -> + 눌러서 생성, 새 탭으로 열기
        
        //+눌러서 생성하는 경우 창 객체 내에 추가
        if(tab.url == "chrome://newtab/"){
        
          tabGroups[tab.windowId][tab.id] = new TreeNode(tab.id); 
          tabGroups[tab.windowId][tab.id].isRoot();

          memberCheck[tab.id] = tabGroups[tab.windowId];

    
        }else if(hyperClick){
          tabGroups[tab.windowId][tab.id] = new TreeNode(tab.id);
          tabGroups[tab.windowId][tab.id].isRoot();
          memberCheck[tab.id] = tabGroups[tab.windowId];

          hyperClick = false;
        }
        else{//부모 탭에서 발생
          
          tabGroups[tab.windowId][tab.id] = new TreeNode(tab.id);
          tabGroups[tab.windowId][tab.openerTabId].addChild(tabGroups[tab.windowId][tab.id]);
    
          memberCheck[tab.id] = tabGroups[tab.windowId];
        }
    
      }else if(windowCreated===true && tabCreated===false){
        //창을 떼는 경우는 창이 생기고 탭은 생성되지 않지만, updated이벤트가 발생하지 않음.
        throw "윈도우가 생성됐는데 탭이 생성 안되는 경우는 없다.";
      }

      //windowCreated===false && tabCreated===false인 경우는 탭이 그냥 업데이트되는 경우이다.
      //따라서 그냥 아래 코드 실행하면 된다.

      //현재 탭에서 첫 url인 경우
      if(memberCheck[tabId][tabId].urls.length==0){
        memberCheck[tabId][tabId].urls.push({ url: tab.url, title: tab.title });
      }
      //현재 탭에서 첫 url이 아닌 경우
      else{
        //해시태그가 있는 url
        let a = tab.url.split("#")[0];
        if(a != tab.url){
          //이전 마지막 url이 같은 페이지 내
          if(a==memberCheck[tabId][tabId].urls[memberCheck[tabId][tabId].urls.length-1].url.split("#")[0]){
            return;
          }
          //이전 마지막 url이 같은 페이지가 아님.
          else{
            memberCheck[tabId][tabId].urls.push({ url: tab.url, title: tab.title });
          }
        
        }
        //해시태그가 없는 url
        else{
          memberCheck[tabId][tabId].urls.push({ url: tab.url, title: tab.title });
        }
      }    

      windowCreated = false;
      tabCreated = false;

      // content.js에 메시지 전송 이 탭이 속해있는 곳의 url을 전송

      chrome.tabs.sendMessage(tab.id, { type: "updateURLHistory", urlHistory: memberCheck[tabId] });
    }
  }

}
);


chrome.tabs.onRemoved.addListener(function (tabId, removeInfo) {
  if(!existingBeforeUsing.tabIds.includes(tabId)){
  
    tabRemoved = true;
    
    //탭을 직접 닫는경우
    if(removeInfo.isWindowClosing===false){
      console.log("1");

      //탭이 하나 남았을 때 닫는 경우이다. 후에 window close 이벤트 발생한다.
      if(Object.keys(memberCheck[tabId]).length-1 === 1  ){
        delete tabGroups[removeInfo.windowId];
        delete memberCheck[tabId];
      }
      //탭이 두개 이상일때 닫는 경우로, window close 이벤트 발생하지 않는다.
      else{

        let delTab = unique();
        renameProperty(memberCheck[tabId], tabId, delTab);

        delete memberCheck[tabId];//membercheck에서의 참조만 삭제하지만, tabGroups에서는 부모-자식관계로 참조되기 때문에 delTab를 key로 가지며 살아있음.
        
        tabRemoved = false;
      }
    }
    //윈도우를 닫는 경우. window close 이벤트 발생한다.
    else{
      console.log("2");

      delete tabGroups[removeInfo.windowId];

      delete memberCheck[tabId];
    }
  

  }
});

chrome.windows.onRemoved.addListener(function(windowId){
  console.log("3");  
  if(!existingBeforeUsing.windowIds.includes(windowId)){
    

    //탭 안사라졌는데 윈도우가 사라진 경우 == 하나 남은 탭 떼서 사라짐
    //onRemoved 이벤트는 가장 마지막에 발생한다.
    if(!tabRemoved){
      delete tabGroups[windowId];
    }
    tabRemoved = false;
  
  
  }
},
{windowType : ["normal"]}
);


chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if(request==='removeAllWindows'){
    removeAllWindows();
    return;
  }
  
  else if (request.type === "getURLHistory") {//popup
    sendResponse({ urlHistory: memberCheck[request.tabId].groupUrls });
  
  } 
  
  else if (request.type === "openOrActivateTab") {
    
    let url = request.url;

    chrome.tabs.query({ url: url, currentWindow: true }, function (tabs) {
    
      if (tabs && tabs.length > 0) {
        // 같은 주소를 가진 탭이 이미 열려 있는 경우
        chrome.tabs.update(tabs[0].id, { active: true });
      } else {
        // 같은 주소를 가진 탭이 없는 경우 새 탭을 엽니다.
        
        hyperClick = true;
        chrome.tabs.create({url: url});

      
      }
    });
  
  }
});

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.type === "currentTabId") {
    console.log("Received tab ID: ", request.tabId);
    let memberCheckValue = memberCheck[request.tabId];
    console.log("memberCheck value for this tab: ", memberCheckValue);

    sendResponse({type: "memberCheckValue", value: memberCheckValue});
  }
  return true;
});
