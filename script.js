function insertContent(
  APIKey, Model
) {
  function getMainContentContainer() {
    function getAllElements(node, selector) {
      const elements = [...node.querySelectorAll(selector)];
      const iterator = (node.ownerDocument || document).createNodeIterator(node, NodeFilter.SHOW_ELEMENT);
      let element;
      while (element = iterator.nextNode()) {
        // shadow DOM
        if (element.shadowRoot) {
          elements.push(...getAllElements(element.shadowRoot, selector));
        }
        if (element.tagName == 'FRAMESET') {
          for (const frame of element.children) {
            try {
              elements.push(...getAllElements(frame.contentDocument, selector));
            } catch (e) { }
          }
        } else {
          try {
            elements.push(...getAllElements(element.contentDocument, selector));
          } catch (e) { }
        }
      }
      return elements;
    }
    const paragraphs = getAllElements(document, 'p');//document.getElementsByTagName('p');
    const divparagraphs = getAllElements(document, 'div');//document.getElementsByTagName('div');
    const groups = {};

    function getDepth(element) {
      let depth = 0;
      let parent = element;
      while (parent) {
        if (parent.id && parent.id.search(/[cC]omment/) != -1)
          return -1;
        if (parent.classList && (parent.classList.contains('Comment') || parent.classList.contains('comment') || parent.classList.contains('title') || parent.classList.contains('follow')))
          return -1;
        if (parent.style && parent.style.display == 'none')
          return -1;

        // parentが、本文っぽくない要素なら、-1を返す
        if (parent.tagName == 'FOOTER' || parent.tagName == 'UL' || parent.tagName == 'LI' || parent.tagName == 'DL' || parent.tagName == 'DT' || parent.tagName == 'DD' || parent.tagName == 'NAV' || parent.tagName == 'HEADER')
          return -1;
        depth++;
        parent = parent.parentNode;
      }
      return depth;
    }

    // グループ化
    for (const paragraph of paragraphs) {
      if (!paragraph.innerText) continue;
      if (paragraph.innerText.search(/(。|\w\.[ ”"]|．])/) < 0 && !paragraph.innerText.endsWith('.')) continue;
      const depth = getDepth(paragraph);
      if (depth == -1) continue;
      if (!groups[depth]) {
        groups[depth] = [];
      }
      groups[depth].push(paragraph);
    }

    for (const divparagraph of divparagraphs) {
      // divparagraphの子要素が、テキストとbr要素のみなら、本文とみなす
      let isText = true;
      for (const child of divparagraph.childNodes) {
        if (child.nodeType == Node.TEXT_NODE) continue;
        // テキストっぽくない要素なら、本文ではない
        if (child.tagName == 'BR' || child.tagName == 'I') continue;
        isText = false;
      }
      if (!isText) continue;
      if (!divparagraph.innerText) continue;
      if (divparagraph.innerText.search(/(。|\w\.[ ”"]|．])/) < 0 && !divparagraph.innerText.endsWith('.')) continue;
      const depth = getDepth(divparagraph);
      if (depth == -1) continue;
      if (!groups[depth]) {
        groups[depth] = [];
      }
      groups[depth].push(divparagraph);
    }

    function commonAncestor(a, b) {
      let ap = a.parentNode;
      const aa = [a];
      while (ap) {
        aa.push(ap);
        ap = ap.parentNode;
      }
      if (aa.indexOf(b) != -1) return b;
      let bp = b.parentNode;
      while (bp) {
        if (aa.indexOf(bp) != -1) {
          return bp;
        }
        bp = bp.parentNode;
      }
      return null;
    }
    function getCommomAncestor(g) {
      if (g.length == 0) return null;
      let mode = g[0];
      const counts = new Map();
      for (let index = 0; index < g.length - 1; index++) {
        for (let index2 = index + 1; index2 < g.length; index2++) {
          let a = commonAncestor(g[index], g[index2]);
          if (!a) continue;
          counts.set(a, counts.get(a) ? counts.get(a) + 1 : 1);
          mode = a;
        }
      }
      let maxCount = 0;
      for (const [key, value] of counts.entries()) {
        if (value > maxCount) {
          mode = key;
          maxCount = value;
        }
      }
      return mode;
    }

    // テキスト量の計算
    let maxTextLength = 0;
    let mainTextancestor;
    let maintext = "";
    let lastContent;
    for (const depth in groups) {
      const textGroup = groups[depth];
      const ancestor = getCommomAncestor(textGroup);
      if (!ancestor) continue;
      let textLength = 0;
      let texts = "";
      let lastC;
      let lastCPosition = { x: 0, y: 0 };
      for (const paragraph of textGroup) {
        const ca = commonAncestor(ancestor, paragraph);
        if (!ca || ca != ancestor) continue;
        textLength += paragraph.innerText.length;
        texts += paragraph.innerText + '\n';
        const rect = paragraph.getBoundingClientRect();
        if (rect.bottom > lastCPosition.y) {
          lastCPosition = { x: rect.right, y: rect.bottom };
          lastC = paragraph;
        }
      }
      if (textLength > maxTextLength) {
        maxTextLength = textLength;
        mainTextancestor = ancestor;
        maintext = texts;
        lastContent = lastC;
      }
    }

    console.log(mainTextancestor, maintext, lastContent);
    return { "container": mainTextancestor, "text": maintext, "lastContent": lastContent };
  }

  const mainContainer = getMainContentContainer();
  if (!mainContainer.container) return;
  // mainContent.lastContentの後ろに新しい要素を追加
  const e = document.createElement('div');
  e.style.cssText = 'all: initial !important; display: block !important;';
  const shadow = e.attachShadow({ mode: 'open' });
  const innerDiv = document.createElement('div');
  innerDiv.lang = 'ja';
  shadow.appendChild(innerDiv);
  mainContainer.lastContent.parentNode.insertBefore(e, mainContainer.lastContent.nextSibling);
  const getElementById = (id) => innerDiv.querySelector(`#${id}`);
  innerDiv.innerHTML = `
<style type="text/css">
#problemo_div {
    border: 2px solid lightskyblue !important;
    padding: 1em !important;
    margin: 1em !important;
    border-radius: 35px !important;
    background: #f5fbff !important;
    box-shadow: 4px 4px 8px #e1e7eb, -4px -4px 8px #ffffff !important;
    transition-property: width, height !important;
    transition-duration: 0.3s !important;
    transition-timing-function: ease !important;
    width: auto !important;
    display: block !important;
    font-family: sans-serif !important;
}

#problemo_div p {
    display: block !important;
    -webkit-margin-before: 1__qem !important;
    -webkit-margin-after: 1__qem !important;
    -webkit-margin-start: 0 !important;
    -webkit-margin-end: 0 !important;
}

#problemo_div div {
    display: block !important;
}

#problemo_div h3 {
    display: block !important;
    font-size: 1.17em !important;
    -webkit-margin-before: 1__qem !important;
    -webkit-margin-after: 1em !important;
    -webkit-margin-start: 0 !important;
    -webkit-margin-end: 0 !important;
    font-weight: bold !important;
}

#problemo_div ol {
    display: block !important;
    list-style-type: decimal !important;
    -webkit-margin-before: 1__qem !important;
    -webkit-margin-after: 1em !important;
    -webkit-margin-start: 0 !important;
    -webkit-margin-end: 0 !important;
    -webkit-padding-start: 40px !important;
}

#problemo_div li {
    display: list-item !important;
    text-align: -webkit-match-parent !important;
    list-style-type: decimal !important;
}

#problemo_div label {
    cursor: default !important;
}

#problemo_div button {
    margin: 0__qem !important;
    font: -webkit-small-control !important;
    text-rendering: auto !important;
    color: initial !important;
    letter-spacing: normal !important;
    word-spacing: normal !important;
    line-height: normal !important;
    text-transform: none !important;
    text-indent: 0 !important;
    text-shadow: none !important;
    display: inline-block !important;
    text-align: start !important;
}

#problemo_div input {
    -webkit-writing-mode: horizontal-tb !important;
    margin: 0__qem !important;
    font: -webkit-small-control !important;
    text-rendering: auto !important;
    color: initial !important;
    letter-spacing: normal !important;
    word-spacing: normal !important;
    line-height: normal !important;
    text-transform: none !important;
    text-indent: 0 !important;
    text-shadow: none !important;
    display: inline-block !important;
    text-align: start !important;
    -webkit-appearance: textfield !important;
    padding: 1px !important;
    background-color: white !important;
    border: 2px inset !important;
    -webkit-rtl-ordering: logical !important;
    -webkit-user-select: text !important;
    cursor: auto !important;
}

#problemo_div input::-webkit-textfield-decoration-container {
    display: flex !important;
    align-items: center !important;
    -webkit-user-modify: read-only !important;
    content: none !important;
}

#problemo_div li::marker {
    unicode-bidi: isolate !important;
    font-variant-numeric: tabular-nums !important;
    text-transform: none !important;
    text-indent: 0px !important;
    text-align: start !important;
    text-align-last: start !important;
}

#problemo_div li::before {
    content: "" !important;
    display: none !important;
}

#problemo_questions .correct>.question-number::after {
    content: " 正解！" !important;
    color: red !important;
    font-weight: 600 !important;
    font-size: 1.17em !important;
}

#problemo_questions .incorrect>.question-number::after {
    content: " 不正解！" !important;
    color: red !important;
    font-weight: 600 !important;
    font-size: 1.17em !important;
}

#problemo_questions .loading {
    display: inline-block !important;
    margin-left: 10px !important;
    border: 2px solid #ccc !important;
    border-radius: 50% !important;
    border-top-color: #666 !important;
    width: 15px !important;
    height: 15px !important;
    animation: spin 0.8s linear infinite !important;
}

@keyframes spin {
    from {
        transform: rotate(0deg);
    }

    to {
        transform: rotate(360deg);
    }
}

#problemo_questions input[type="radio"] {
    display: none !important;
}

#problemo_questions .choice-button {
    position: relative !important;
    display: block !important;
}

#problemo_questions .choice-label {
    display: block !important;
    background: #dbdee2 !important;
    color: #00284f !important;
    border-radius: 5px !important;
    padding: 5px 20px !important;
    border: 2px solid #8493a2 !important;
    margin-bottom: 5px !important;
    cursor: pointer !important;
}

#problemo_questions .choice-label * {
    cursor: pointer !important;
}

#problemo_questions .choice-num {
    display: inline-block !important;
    padding: 5px 10px !important;
    margin-right: 10px !important;
    color: #000 !important;
    font-weight: bold !important;
}

#problemo_questions label {
    display: inline-block !important;
    position: relative !important;
}

#problemo_questions input[type="radio"]:checked+.choice-label {
    background-color: #9ed2fc !important;
    border: 2px solid #2175d0 !important;
}

#problemo_questions h3 {
    font-weight: 600 !important;
    margin-bottom: 12px !important;
    margin-top: 24px !important;
}

#problemo_questions button {
    padding: 8px 15px !important;
    -webkit-appearance: none !important;
    background-color: #d0cfcf !important;
    padding-right: 30px !important;
    padding-left: 30px !important;
    color: #1d1d1d !important;
    background-color: #e0e0e0 !important;
    font-family: inherit !important;
    font-size: inherit !important;
    margin-right: 6px !important;
    margin-bottom: 6px !important;
    padding: 10px !important;
    border: none !important;
    border-radius: 6px !important;
    outline: none !important;
    cursor: pointer !important;
    transition: background-color .1s linear, border-color .1s linear, color .1s linear, box-shadow .1s linear, transform .1s ease !important;
}

#problemo_questions button * {
    cursor: pointer !important;
}

#problemo_questions button:active {
    transform: translateY(2px) !important;
}

#problemo_questions button:focus {
    box-shadow: 0 0 0 2px rgba(0, 150, 191, .67) !important;
}

#problemo_questions button:hover {
    background: #9b9b9b !important;
    background: var(--button-hover) !important;
}

#problemo_questions input {
    -webkit-appearance: none !important;
    vertical-align: top !important;
    color: #1d1d1d !important;
    background-color: #efefef !important;
    font-family: inherit !important;
    font-size: inherit !important;
    margin-right: 6px !important;
    margin-bottom: 6px !important;
    padding: 10px !important;
    border: none !important;
    border-radius: 6px !important;
    outline: none !important;
    display: block !important;
    transition: background-color .1s linear, border-color .1s linear, color .1s linear, box-shadow .1s linear, transform .1s ease !important;
}

#problemo_questions input:focus {
    box-shadow: 0 0 0 2px rgba(0, 150, 191, .67) !important;
}

#problemo_questions {
    line-height: 1.4 !important;
    max-width: 800px !important;
    margin: 20px auto !important;
    padding: 0 10px !important;
    word-wrap: break-word !important;
    color: #363636 !important;
    text-rendering: optimizeLegibility !important;
}

#problemo_form-button-div {
    width: 100% !important;
    text-align: center !important;
    box-sizing: border-box !important;
    vertical-align: middle !important;
}

#problemo_div.Button,
#problemo_div.Button * {
    cursor: pointer !important;
}
</style>
<div id="problemo_div" class="Button">
  <div id="problemo_form-button-div" style="display:block !important;">
    <img width="50px" height="50px" style="width:50px !important;height:50px !important;vertical-align:middle !important;" src="data:image/png;base64,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REQkAgx0IiIiEWCgExERiQADnYiISAQY6ERERCLAQCciIhIBBjoREZEIMNCJiIhEgIFOREQkAgx0IiIiEWCgExERiQADnYiISAQY6ERERCLAQCciIhIBBjoREZEIMNCJiIhEgIFOREQkAgx0IiIiEWCgExERiQADnYiISAQY6ERERCLAQCciIhIBBjoREZEIMNCJiIhEgIFOREQkAgx0IiIiEWCgExERiQADnYiISAQY6ERERCLAQCciIhIBBjoREZEIMNCJiIhEgIFOREQkAgx0IiIiEWCgExERiQADnYiISAQY6ERERCLAQCciIhIBBjoREZEIMNCJiIhEgIFOREQkAgx0IiIiEWCgExERiQADnYiISAQY6ERERCLAQCciIhIBBjoREZEIMNCJiIhEgIFOREQkAgx0IiIiEWCgExERiQADnYiISAQY6ERERCLAQCciIhIBBjoREZEIMNCJiIhEgIFOREQkAgx0IiIiEWCgExERiQADnYiISAQY6ERERCLAQCciIhIBBjoREZEIMNCJiIhEgIFOREQkAgx0IiIiEWCgExERiQADnYiISAQY6ERERCLAQCciIhIBBjoREZEI/D+tJR5QuBzUAQAAAABJRU5ErkJggg=="/>
    <span id="problemo_generating_message">問題生成！</span>
  </div>
  <div id="problemo_questions_container">
    <div id="problemo_questions" style="display:none !important;">
      <div id="problemo_question1">
        <h3 class="question-number">問１</h3>
        <div class="generating" id="problemo_gen1">
          <p>生成中…<span class="loading"></span></p>
        </div>
        <div class="question" style="display:none !important;" id="problemo_q1">
          <p class="question-text" id="problemo_q1t"></p>
          <input type="text" class="answer-input" placeholder="回答" id="problemo_i1">
        </div>
        <div class="answer" id="problemo_a1" style="display:none !important;">
          <p class="answer-text">答え：<span id="problemo_a1t"></span></p>
        </div>
        <div class="errormessage" id="problemo_error1" style="display:none !important;">
          <p>エラー。生成できませんでした。</p>
        </div>
      </div>

      <div id="problemo_question2">
        <h3 class="question-number">問２</h3>
        <div class="generating" id="problemo_gen2">
          <p>生成中…<span class="loading"></span></p>
        </div>
        <div class="question" style="display:none !important;" id="problemo_q2">
          <p class="question-text" id="problemo_q2t"></p>
          <div class="choices">
            <form id="problemo_form2">
              <div class="choice-button">
                <input type="radio" name="q2" value="1" id="problemo_i2_1">
                <label class="choice-label" for="problemo_i2_1">
                  <span class="choice-num">1.</span>
                  <span id="problemo_q2_1"></span>
                </label>
              </div>
              <div class="choice-button">
                <input type="radio" name="q2" value="2" id="problemo_i2_2">
                <label class="choice-label" for="problemo_i2_2">
                  <span class="choice-num">2.</span>
                  <span id="problemo_q2_2"></span>
                </label>
              </div>
              <div class="choice-button">
                <input type="radio" name="q2" value="3" id="problemo_i2_3">
                <label class="choice-label" for="problemo_i2_3">
                  <span class="choice-num">3.</span>
                  <span id="problemo_q2_3"></span>
                </label>
              </div>
              <div class="choice-button">
                <input type="radio" name="q2" value="4" id="problemo_i2_4">
                <label class="choice-label" for="problemo_i2_4">
                  <span class="choice-num">4.</span>
                  <span id="problemo_q2_4"></span>
                </label>
              </div>
            </form>
          </div>
        </div>
        <div class="answer" id="problemo_a2" style="display:none !important;">
          <p class="answer-text">答え：<span id="problemo_a2t"></span></p>
          <p class="answer-text" id="problemo_a2e"></p>
        </div>
        <div class="errormessage" id="problemo_error2" style="display:none !important;">
          <p>エラー。生成できませんでした。</p>
        </div>
      </div>

      <div id="problemo_question3">
        <h3 class="question-number">問３</h3>
        <div class="generating" id="problemo_gen3">
          <p>生成中…<span class="loading"></span></p>
        </div>
        <div class="question" style="display:none !important;" id="problemo_q3">
          <p class="question-text" id="problemo_q3t"></p>
          <div class="choices">
            <form id="problemo_form3">
              <div class="choice-button">
                <input type="radio" name="q3" value="1" id="problemo_i3_1">
                <label class="choice-label" for="problemo_i3_1">
                  <span class="choice-num">1.</span>
                  <span id="problemo_q3_1"></span>
                </label>
              </div>
              <div class="choice-button">
                <input type="radio" name="q3" value="2" id="problemo_i3_2">
                <label class="choice-label" for="problemo_i3_2">
                  <span class="choice-num">2.</span>
                  <span id="problemo_q3_2"></span>
                </label>
              </div>
              <div class="choice-button">
                <input type="radio" name="q3" value="3" id="problemo_i3_3">
                <label class="choice-label" for="problemo_i3_3">
                  <span class="choice-num">3.</span>
                  <span id="problemo_q3_3"></span>
                </label>
              </div>
              <div class="choice-button">
                <input type="radio" name="q3" value="4" id="problemo_i3_4">
                <label class="choice-label" for="problemo_i3_4">
                  <span class="choice-num">4.</span>
                  <span id="problemo_q3_4"></span>
                </label>
              </div>
            </form>
          </div>
        </div>
        <div class="answer" id="problemo_a3" style="display:none !important;">
          <p class="answer-text">答え：<span id="problemo_a3t"></span></p>
          <!--<ol>
            <li id="problemo_e3_1"></li>
            <li id="problemo_e3_2"></li>
            <li id="problemo_e3_3"></li>
            <li id="problemo_e3_4"></li>
          </ol>-->
        </div>
        <div class="errormessage" id="problemo_error3" style="display:none !important;">
          <p>エラー。生成できませんでした。</p>
        </div>
      </div>

      <div id="problemo_check" style="display:none !important;">
        <button class="submit-button" id="problemo_checkButton">答えを確認</button>
      </div>
    </div>
  </div>
</div>`;
  let Q1 = {}, Q2 = {}, Q3 = {};
  let submitted = false;
  const submitClick = () => {
    if (submitted)
      return;
    getElementById('problemo_div').removeEventListener('click', submitClick);
    getElementById('problemo_div').classList.remove('Button');

    submitted = true;
    getElementById('problemo_generating_message').innerText = "問題生成中...";
    function displayCheckAnswerButton() {
      // Q1、Q2、Q3空（初期値）でなければ表示
      if (Object.keys(Q1).length && Object.keys(Q2).length && Object.keys(Q3).length) {
        getElementById('problemo_check').style.cssText = 'display:block !important';
      }
    }
    try {
      getElementById('problemo_questions').style.cssText = 'display:block !important'
      let content = mainContainer.text;
      if (content.length > 3000)
        content = content.substring(0, 3000);
      console.log(content);
      const req_q1q2 = new XMLHttpRequest();
      const req_q3 = new XMLHttpRequest();
      req_q1q2.onreadystatechange = () => {
        console.log(req_q1q2.readyState);
        if (req_q1q2.readyState != 4) return;
        try {
          getElementById('problemo_generating_message').innerText = "";
          Q1 = { question: "エラー", answer: "エラー" };
          Q2 = { question: "エラー", answer: "エラー" };

          console.log(req_q1q2, req_q1q2.responseText);
          if (req_q1q2.status != 200) throw new Error();
          const message = JSON.parse(JSON.parse(req_q1q2.responseText)["choices"][0]["message"]["function_call"]["arguments"]);
          Q1 = {
            question: message["Q1_穴をあけた短文"],
            answer: message["Q1_answer"],
          };

          const Q2answer = Math.floor(Math.random() * 3.999 + 1);
          const Q2choices = [
            message["Q2_choice2_incorrect"],
            message["Q2_choice3_incorrect"],
            message["Q2_choice4_incorrect"],
          ];
          Q2choices.splice(Q2answer - 1, 0, message["Q2_choice1_correct"]);
          Q2 = {
            question: message["Q2_穴をあけた短文"],
            answer: Q2answer,
            choices: Q2choices
          };
          if (Q1.question && Q1.answer && Q2.question && Q2.answer && Q2.choices[0] && Q2.choices[1] && Q2.choices[2] && Q2.choices[3]) {
            console.log(Q1, Q2);
          } else {
            throw new Error();
          }

          getElementById('problemo_q1t').innerText = Q1.question;
          getElementById('problemo_a1t').innerText = Q1.answer;
          getElementById('problemo_gen1').style.cssText = 'display:none !important'
          getElementById('problemo_q1').style.cssText = 'display:block !important'
          getElementById('problemo_error1').style.cssText = 'display:none !important'

          getElementById('problemo_q2t').innerText = Q2.question;
          getElementById('problemo_a2t').innerText = Q2.answer;
          //getElementById('problemo_a2e').innerText = Q2.explanation;
          getElementById('problemo_q2_1').innerText = Q2.choices[0];
          getElementById('problemo_q2_2').innerText = Q2.choices[1];
          getElementById('problemo_q2_3').innerText = Q2.choices[2];
          getElementById('problemo_q2_4').innerText = Q2.choices[3];
          getElementById('problemo_gen2').style.cssText = 'display:none !important'
          getElementById('problemo_q2').style.cssText = 'display:block !important'
          getElementById('problemo_error2').style.cssText = 'display:none !important'
        } catch (error) {
          console.log(error);
          getElementById('problemo_gen1').style.cssText = 'display:none !important'
          getElementById('problemo_q1').style.cssText = 'display:none !important'
          getElementById('problemo_error1').style.cssText = 'display:block !important'

          getElementById('problemo_gen2').style.cssText = 'display:none !important'
          getElementById('problemo_q2').style.cssText = 'display:none !important'
          getElementById('problemo_error2').style.cssText = 'display:block !important'
        }
        displayCheckAnswerButton();
      }
      req_q3.onreadystatechange = () => {
        console.log(req_q3.readyState);
        if (req_q3.readyState != 4) return;
        try {
          getElementById('problemo_generating_message').innerText = "";
          Q3 = { question: "エラー", answer: "エラー" };
          console.log(req_q3, req_q3.responseText);
          if (req_q3.status != 200) throw new Error();

          const message = JSON.parse(JSON.parse(req_q3.responseText)["choices"][0]["message"]["function_call"]["arguments"]);

          const Q3answer = Math.floor(Math.random() * 3.999 + 1);
          const Q3choices = [
            message["choice1_correct"],
            message["choice2_correct"],
            message["choice3_correct"],
          ];
          Q3choices.splice(Q3answer - 1, 0, message["choice4_rewrite_to_incorrect"]);
          Q3 = {
            question: "以下の選択肢のうち、上の文章の内容に合致しないものを選びなさい。",
            answer: Q3answer,
            choices: Q3choices
          };
          //すべてundefinedではないことを確認
          if (Q3.question && Q3.answer && Q3.choices[0] && Q3.choices[1] && Q3.choices[2] && Q3.choices[3]) {
            console.log(Q3);
          } else {
            throw new Error();
          }

          if (!Q3.question || !Q3.answer) throw new Error();
          getElementById('problemo_q3t').innerText = Q3.question;
          getElementById('problemo_a3t').innerText = Q3.answer;
          getElementById('problemo_q3_1').innerText = Q3.choices[0];
          getElementById('problemo_q3_2').innerText = Q3.choices[1];
          getElementById('problemo_q3_3').innerText = Q3.choices[2];
          getElementById('problemo_q3_4').innerText = Q3.choices[3];
          //getElementById('problemo_e3_1').innerText = Q3.explanations[0];
          //getElementById('problemo_e3_2').innerText = Q3.explanations[1];
          //getElementById('problemo_e3_3').innerText = Q3.explanations[2];
          //getElementById('problemo_e3_4').innerText = Q3.explanations[3];
          getElementById('problemo_gen3').style.cssText = 'display:none !important'
          getElementById('problemo_q3').style.cssText = 'display:block !important'
          getElementById('problemo_error3').style.cssText = 'display:none !important'
        } catch (error) {
          console.log(error);
          getElementById('problemo_gen3').style.cssText = 'display:none !important'
          getElementById('problemo_q3').style.cssText = 'display:none !important'
          getElementById('problemo_error3').style.cssText = 'display:block !important'
        }
        displayCheckAnswerButton();
      }
      req_q1q2.open('POST', 'https://api.openai.com/v1/chat/completions', true);
      req_q3.open('POST', 'https://api.openai.com/v1/chat/completions', true);
      req_q1q2.setRequestHeader('content-type', 'application/json;charset=UTF-8');
      req_q1q2.setRequestHeader('Authorization', 'Bearer ' + APIKey);

      req_q3.setRequestHeader('content-type', 'application/json;charset=UTF-8');
      req_q3.setRequestHeader('Authorization', 'Bearer ' + APIKey);

      var dataQ1Q2 = JSON.stringify({
        'model': Model,
        'messages': [
          {
            "role": "assistant",
            "content": null,
            "function_call": {
              "arguments": '{\
"Q1_穴をあける前の短文":"年金を受け取る年齢が上昇傾向にある。",\
"Q1_穴をあけた短文":"年金を受け取る年齢が____にある。",\
"Q1_answer":"上昇傾向",\
"Q2_穴をあける前の短文":"公的年金の財政を５年に１回点検する「財政検証」が行われる。",\
"Q2_穴をあけた短文":"____の財政を５年に１回点検する「財政検証」が行われる。",\
"Q2_choice1_correct":"公的年金",\
"Q2_choice2_incorrect":"政治資金",\
"Q2_choice3_incorrect":"公共政策",\
"Q2_choice4_incorrect":"教育"\
}',
              "name": "problem"
            }
          },
          {
            "role": "system",
            "content": '与えられた文章から選択問題を作成します。'
          },
          {
            "role": "user",
            "content": content
          },
        ],
        "functions": [
          {
            "name": "problem",
            "description": "文章から作った穴埋め選択問題。まず、正しい文を作ります。問題にできそうな場所を「____」で穴にします。",
            "parameters": {
              "type": "object",
              "properties": {
                "Q1_穴をあける前の短文": {
                  "type": "string",
                  "description": "文章から作った穴のない短文。15文字以内。",
                },
                "Q1_穴をあけた短文": {
                  "type": "string",
                  "description": "問題にできそうな場所で穴をあける。",
                },
                "Q1_answer": {
                  "type": "string",
                  "description": "正しい答え。assert replace(\"Q1_穴をあけた短文\",\"____\",\"Q1_answer\")==\"Q1_穴をあける前の短文\"",
                },
                "Q2_穴をあける前の短文": {
                  "type": "string",
                  "description": "文章から作った穴のない短文。15文字以内。",
                },
                "Q2_穴をあけた短文": {
                  "type": "string",
                  "description": "問題にできそうな場所で穴をあける。",
                },
                "Q2_choice1_correct": {
                  "type": "string",
                  "description": "選択肢１つ目。正しい答え。穴にあてはまる。assert replace(\"穴をあけた短文\",\"____\",\"choice1_correct\")==\"穴をあける前の短文\"",
                },
                "Q2_choice2_incorrect": {
                  "type": "string",
                  "description": "選択肢の２つ目。間違った選択肢。",
                },
                "Q2_choice3_incorrect": {
                  "type": "string",
                  "description": "選択肢の３つ目。間違った選択肢。",
                },
                "Q2_choice4_incorrect": {
                  "type": "string",
                  "description": "選択肢の４つ目。間違った選択肢。",
                },
              },
              "required": [
                "Q1_穴をあける前の短文",
                "Q1_穴をあけた短文",
                "Q1_answer",
                "Q2_穴をあける前の短文",
                "Q2_穴をあけた短文",
                "Q2_choice1_correct",
                "Q2_choice2_incorrect",
                "Q2_choice3_incorrect",
                "Q2_choice4_incorrect"]
            }
          }
        ],
        "function_call": { "name": "problem" }
      });

      var dataQ3 = JSON.stringify({
        'model': Model,
        'messages': [
          {
            "role": "assistant",
            "content": "これはproblem関数の例です。このように答えます。",
            "function_call": {
              "arguments": '{\
"choice1_correct":"内閣府は「生活設計と年金に関する世論調査」の結果を発表した。",\
"choice2_correct":"６１歳以上まで働きたいと答えた人が最多の71.7%だった。",\
"choice3_correct":"公的年金の財政を５年に１回点検する「財政検証」が行われる。",\
"choice4_correct":"年金額が減らないように就業時間を調整しながら会社などで働くと答えた人が多かった。",\
"choice4_rewrite_to_incorrect":"年金額を増やすため、就業時間を調整せずに会社で働くと答えた人が多かった。"\
      }',
              "name": "example_of_problem"
            }
          },
          {
            "role": "system",
            "content": '与えられた文章から選択問題を作成します。'
          },
          {
            "role": "user",
            "content": content
          },
        ],
        "functions": [
          {
            "name": "problem",
            "description": "文章から作った選択問題。まず、正しい４つの選択肢を作り、4だけ少し書き換えて誤った情報にしたものを用意します。",
            "parameters": {
              "type": "object",
              "properties": {
                "choice1_correct": {
                  "type": "string",
                  "description": "文章から読み取れる正しい内容。選択肢の1つ目",
                },
                "choice2_correct": {
                  "type": "string",
                  "description": "文章から読み取れる正しい内容。選択肢の2つ目",
                },
                "choice3_correct": {
                  "type": "string",
                  "description": "文章から読み取れる正しい内容。選択肢の3つ目",
                },
                "choice4_correct": {
                  "type": "string",
                  "description": "文章から読み取れる正しい内容。選択肢の4つ目",
                },
                "choice4_rewrite_to_incorrect": {
                  "type": "string",
                  "description": "choice4_correctをほんの少し書き換えて、文章の内容とは異なる情報にする",
                },
              },
              "required": ["choice1_correct", "choice2_correct", "choice3_correct", "choice4_correct", "choice4_rewrite_to_incorrect"]
            }
          }
        ],
        "function_call": { "name": "problem" }
      });

      req_q1q2.send(dataQ1Q2);
      req_q3.send(dataQ3);
    } catch (error) {
      getElementById('problemo_generating_message').innerText = "コンテンツの取得に失敗しました。";
      return;
    }
  }
  let checked = false;
  const checkTheAnswer = () => {
    if (checked) {
      getElementById('problemo_checkButton').innerText = "確認済み";
      return;
    }
    checked = true;
    getElementById('problemo_a1').style.cssText = 'display:block !important'
    getElementById('problemo_a2').style.cssText = 'display:block !important'
    getElementById('problemo_a3').style.cssText = 'display:block !important'
    try {
      // Q1.answerがエラーの場合は例外を投げる
      if (Q1.answer == "エラー") throw new Error();
      getElementById('problemo_question1').classList.add(
        getElementById('problemo_i1').value == Q1.answer ? 'correct' : 'incorrect'
      );
    } catch (error) {
      console.log(error);
    }
    try {
      if (Q2.answer == "エラー") throw new Error();
      getElementById('problemo_question2').classList.add(
        getElementById('problemo_form2').elements['q2'].value == Q2.answer ? 'correct' : 'incorrect'
      );
    } catch (error) {
      console.log(error);
    }
    try {
      if (Q3.answer == "エラー") throw new Error();
      getElementById('problemo_question3').classList.add(
        getElementById('problemo_form3').elements['q3'].value == Q3.answer ? 'correct' : 'incorrect'
      );
    } catch (error) {
      console.log(error);
    }
  }
  if (!APIKey || !Model) {
    getElementById('problemo_generating_message').innerText = "APIキーまたはモデルが設定されていません。";
    return;
  }
  getElementById('problemo_div').addEventListener('click', submitClick);
  getElementById('problemo_checkButton').addEventListener('click', checkTheAnswer);
}

window.addEventListener('load', () => {

  chrome.storage.sync.get(
    (items) => {
      try {
        const APIKey = items.APIKey;
        const Model = items.Model;
        setTimeout(() => {
          insertContent(APIKey, Model);
        }, 1000);
      } catch (e) {
        console.log(e);
      }
    }
  );
});