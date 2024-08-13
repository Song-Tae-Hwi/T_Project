window.addEventListener('DOMContentLoaded', function() {
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      let currentTabId = tabs[0].id;
      chrome.runtime.sendMessage({type: "currentTabId", tabId: currentTabId}, function(response) {
          if (response.type === "memberCheckValue") {
            console.log("Received memberCheck value: ", response.value);
            visualization(response.value);
          }
      });
  });    
}); 

function visualization(urlHistory) {
  var urlList = document.getElementById("url-list");
  urlList.innerHTML = "";

  for (let rootNode in urlHistory){
      console.log(rootNode);
      if (urlHistory[rootNode].root===true){
          visualTab(urlList, urlHistory[rootNode]);
      }
  }
}

function visualTab(parent, tab, level = 0) {
  let ol = document.createElement("ol");
  ol.style.paddingLeft = `${level + 1}em`;
  ol.style.marginBottom = "10px";

  for (let urlNTitle of tab.urls) {
    let li = document.createElement("li");
    let a = document.createElement("a");
    a.href = urlNTitle.url;
    a.classList.add("tooltip");

    let favicon = document.createElement("img");
    favicon.src = "https://www.google.com/s2/favicons?domain=" + urlNTitle.url;
    favicon.style.marginRight = "5px";
    a.appendChild(favicon);

    let textNode = document.createTextNode(
      urlNTitle.title 
          ? (urlNTitle.title.length > 20 ? urlNTitle.title.substring(0, 20) + "..." : urlNTitle.title)
          : (urlNTitle.url.length > 20 ? urlNTitle.url.substring(0, 20) + "..." : urlNTitle.url)
    );

     let tooltipText = document.createElement("span");
      tooltipText.classList.add("tooltip-text");
      tooltipText.textContent = urlNTitle.title ? urlNTitle.title : urlNTitle.url;
      a.appendChild(tooltipText);

    a.appendChild(textNode);

    a.onclick = function (event) {
      event.preventDefault();
      chrome.runtime.sendMessage({ type: "openOrActivateTab", url: urlNTitle.url });
    };

    li.appendChild(a);
    ol.appendChild(li);
  }

  parent.appendChild(ol);

  if (tab.children.length !== 0) {
    for (let node of tab.children) {
      visualTab(ol, node, level + 1);
    }
  }

  let nextSibling = ol.nextSibling;
  if (nextSibling && nextSibling.tagName === "OL") {
    let br = document.createElement("br");
    parent.appendChild(br);
  }
}
