//페이지 DOM 만들어지면 바로 호출한다.
function a(){
    var subPack = document.getElementById("sub_pack");

    //subPack 있는 경우 근데 네이버는 다 오른쪽 배너 있는 듯
    if (subPack !== null) {
        var urlDiv = createUrlDiv();
        subPack.insertBefore(urlDiv, subPack.firstChild);
    } 
    //subPack 없는 경우
    else {
        var mainPack = document.getElementById("main_pack");

        var newDiv = document.createElement("div");
        newDiv.id = "main_Pack_next";
        mainPack.insertAdjacentElement("afterend", newDiv);

        var urlDiv = createUrlDiv();
        newDiv.insertBefore(urlDiv, newDiv.firstChild);
    }

}
a();


function createUrlDiv() {
    var urlDiv = document.createElement("div");
    urlDiv.id = "url-list";
    urlDiv.style.position = "relative";
    urlDiv.style.top = 0;
    urlDiv.style.backgroundColor = "white";
    urlDiv.style.padding = "10px";
    urlDiv.style.overflow = "auto";
    urlDiv.style.width = "380px" ;
    urlDiv.style.height = "400px";
    urlDiv.style.left = "16px";
    urlDiv.style.marginBottom = "20px";
    urlDiv.style.zIndex = "0";
    urlDiv.style.borderRadius = "8px";
    urlDiv.style.border = "1px solid #dadce0";
    urlDiv.style.zIndex = "0";
  
    // 스크롤바 스타일 지정
    var styleElement = document.createElement("style");
    styleElement.textContent = `
    #${urlDiv.id}::-webkit-scrollbar {
        width: 10px;
      }
  
      #${urlDiv.id}::-webkit-scrollbar-track {
        background: #f1f1f1;
        border-radius: 10px;
      }
  
      #${urlDiv.id}::-webkit-scrollbar-thumb {
        background: #888;
        border-radius: 10px;
      }
  
      #${urlDiv.id}::-webkit-scrollbar-thumb:hover {
        background: #555;
      }
    `;

    document.head.appendChild(styleElement);

    return urlDiv;
}

//최상위 탭객체를 받아서 그 탭 내부의 url 보여주고 하위 자식들 재귀적 출력
function visualTab(parent, tab, level = 0) {
    let ol = document.createElement("ol");
    ol.style.paddingLeft = `${level + 1}em`; // Indentation based on level
    ol.style.marginBottom = "10px"; // 원하는 간격으로 수정 가능

    for (let urlNTitle of tab.urls) {
        let li = document.createElement("li");
        let a = document.createElement("a");
        a.href = urlNTitle.url;

        let favicon = document.createElement("img");
        favicon.src = urlNTitle.url + "/favicon.ico";
        favicon.style.marginRight = "5px";
        favicon.style.width = "16px";  // 원하는 너비를 지정합니다.
        favicon.style.height = "16px";
        a.appendChild(favicon);

        let textNode = document.createTextNode(
            urlNTitle.title ? urlNTitle.title : urlNTitle.url
        );
        a.appendChild(textNode);

      //링크가 존재
        a.onclick = function (event) {
            event.preventDefault();
            
            chrome.runtime.sendMessage({ type: "openOrActivateTab", url: urlNTitle.url});
        };


        li.appendChild(a);
        ol.appendChild(li);
    }

    parent.appendChild(ol);

    if (tab.children.length !== 0) {
        for (let node of tab.children) {
            visualTab(ol, node, level + 1); // Increment the level for nested <ol>
        }
    }

    // Check if there's a <ol> immediately after </ol> and insert <br> between them
    let nextSibling = ol.nextSibling;
    if (nextSibling && nextSibling.tagName === "OL") {
        let br = document.createElement("br");
        parent.appendChild(br);
    }
}

//현재 탭이 속해있는 윈도우객체받는다
function visualization(urlHistory) {
    console.log("시각화진행합니다");

    var urlList = document.getElementById("url-list");
    
    for (let rootNode in urlHistory){
        console.log(rootNode);
        if (urlHistory[rootNode].root===true){
            visualTab(urlList, urlHistory[rootNode]);
        }
    }

}

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.type === "updateURLHistory") {
        visualization(request.urlHistory);
    }
});