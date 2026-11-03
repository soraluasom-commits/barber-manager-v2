/* Read-only learning catalogue. No shop data, formulas or sync records are changed. */
(() => {
 const sources={wahl:'https://wahlusa.com/how-to/haircutting/mens-haircuts',list:'https://en.wikipedia.org/wiki/List_of_hairstyles',crew:'https://psp.americancrew.com/videos/haircuts/',tools:'https://www.wahl.co.uk/content-hub/product-guides/home-hair-cutting-guide/'};
 const hairs=window.BarberHairCatalogue||[];
 const toolsRows=[
 ['ปัตตาเลี่ยน','Clipper','เครื่องตัด','ลดความยาวและไล่ระดับผมพื้นที่กว้าง','ดูชนิดใบมีด คันโยก น้ำหนัก และรองหวีที่รองรับ'],
 ['เครื่องเก็บขอบ','Trimmer','เครื่องตัด','เก็บจอน แนวกรอบผม และรายละเอียด','หัวเล็กกว่าปัตตาเลี่ยน ตรวจความคมและการตั้งใบมีดตามคู่มือ'],
 ['เครื่องโกนฟอยล์','Foil shaver','เครื่องตัด','เก็บตอสั้นให้เรียบในงานเฟดหรือโกน','ใช้กับความยาวที่รุ่นนั้นรองรับ ไม่ใช้แทนปัตตาเลี่ยนตัดผมยาว'],
 ['ใบมีดสำรอง','Replacement blade','เครื่องตัด','เปลี่ยนชุดตัดเมื่อสึกหรือเปลี่ยนลักษณะงาน','ต้องตรงรุ่น ไม่สรุปว่าใบมีดหน้าตาเหมือนกันใช้แทนกันได้'],
 ['รองหวี','Clipper guards','เครื่องตัด','ช่วยควบคุมระยะผมที่เหลือจากใบมีด','ตรวจความยาวหน่วยมิลลิเมตรและระบบล็อก เบอร์แต่ละยี่ห้ออาจต่างกัน'],
 ['กรรไกรตัด','Cutting shears','กรรไกรและมีดโกน','ตัดเส้นทรงและความยาวด้วยใบคมสองด้าน','เลือกขนาด ด้าม และรุ่นมือซ้ายหรือขวาที่เหมาะกับมือ'],
 ['กรรไกรซอย','Thinning shears','กรรไกรและมีดโกน','ลดน้ำหนักผมหรือเกลี่ยรอยต่อด้วยใบฟัน','จำนวนฟันไม่ใช่ตัวบอกอัตราการกินผมเพียงอย่างเดียว'],
 ['กรรไกรสร้างเท็กซ์เจอร์','Texturizing shears','กรรไกรและมีดโกน','สร้างการแตกช่อและเปลี่ยนมวลของทรง','เลือกช่องฟันและตำแหน่งการใช้ให้ตรงกับผลที่ต้องการ'],
 ['มีดโกนเปลี่ยนใบ','Shavette','กรรไกรและมีดโกน','เก็บกรอบผมหรืองานโกนด้วยใบมีดเปลี่ยนได้','เปลี่ยนใบและดูแลสุขอนามัยตามขั้นตอนของร้านและคู่มือ'],
 ['มีดซอยพร้อมการ์ด','Guarded styling razor','กรรไกรและมีดโกน','สร้างปลายผมนุ่มและปรับเท็กซ์เจอร์','ต้องประเมินสภาพเส้นผมและใช้ใบที่ออกแบบสำหรับงานซอย'],
 ['หวีตัด','Cutting comb','หวีและแปรง','แบ่งช่อ ยกผม และควบคุมแนวตัด','เลือกซี่และสีที่มองเห็นเส้นผมได้ชัด'],
 ['หวีปัตตาเลี่ยน','Clipper comb','หวีและแปรง','รองผมสำหรับเทคนิคปัตตาเลี่ยนเหนือหวี','แผงกว้างช่วยคุมระนาบ แต่ต้องฝึกมุมการยก'],
 ['หวีหาง','Tail comb','หวีและแปรง','แบ่งแนวแสกและช่อผม','เลือกปลายที่เรียบ ไม่ขูดหนังศีรษะ'],
 ['แปรงกลม','Round brush','หวีและแปรง','ยกโคนและสร้างความโค้งขณะไดร์','เลือกเส้นผ่านศูนย์กลางให้เหมาะกับความยาวผม'],
 ['แปรงระบายลม','Vent brush','หวีและแปรง','ช่วยจัดทิศทางผมและให้ลมผ่านระหว่างไดร์','เหมาะกับงานแห้งและสร้างทรงที่ไม่ต้องม้วนแน่น'],
 ['แปรงปัดเศษผม','Neck duster','หวีและแปรง','ปัดเส้นผมที่ตกค้างบนผิวและผ้าคลุม','ทำความสะอาดตามวัสดุและแยกจากแปรงทำความสะอาดเครื่อง'],
 ['ไดร์เป่าผม','Hair dryer','จัดทรง','ทำให้แห้งและกำหนดทิศทางผม','ดูระดับลม ความร้อน หัวเป่า และการทำความสะอาดช่องดูดลม'],
 ['หัวดิฟฟิวเซอร์','Diffuser','จัดทรง','กระจายลมเพื่อช่วยรักษารูปทรงลอน','ตรวจการเข้ากันกับไดร์และใช้ความร้อนตามสภาพผม'],
 ['เครื่องหนีบ','Flat iron','จัดทรง','จัดผมให้เรียบหรือสร้างโค้งด้วยความร้อน','เลือกอุณหภูมิตามสภาพเส้นผมและคู่มืออุปกรณ์'],
 ['ขวดสเปรย์น้ำ','Spray bottle','อุปกรณ์ประจำร้าน','เติมความชื้นและเตรียมช่อผมก่อนตัด','ใช้ภาชนะสะอาดและติดฉลากหากบรรจุผลิตภัณฑ์อื่น'],
 ['กิ๊บแบ่งผม','Sectioning clips','อุปกรณ์ประจำร้าน','แยกช่อผมเพื่อคุมแนวตัด','เลือกแรงหนีบและขนาดตามความหนาของช่อ'],
 ['ผ้าคลุมและกระดาษรองคอ','Cape / neck strips','อุปกรณ์ประจำร้าน','รองรับเศษผมและแยกผ้าคลุมจากผิวบริเวณคอ','เปลี่ยนหรือทำความสะอาดตามชนิดวัสดุระหว่างลูกค้า'],
 ['น้ำมันใบมีดและแปรงทำความสะอาด','Blade oil / cleaning brush','ดูแลเครื่องมือ','ดูแลชุดใบมีดให้ทำงานตามปกติ','น้ำมันหล่อลื่นไม่ใช่น้ำยาฆ่าเชื้อ ใช้ผลิตภัณฑ์ตามที่ผู้ผลิตกำหนด'],
 ['น้ำยาสำหรับเครื่องมือ','Tool disinfectant','ดูแลเครื่องมือ','ใช้ในขั้นตอนดูแลสุขอนามัยของเครื่องมือที่รองรับ','ทำตามฉลากเรื่องความเข้มข้นและเวลาสัมผัส ไม่ใช้สูตรเดียวกับทุกวัสดุ']
 ];
 const equipment=toolsRows.map(r=>({name:r[0],en:r[1],cat:r[2],description:r[3],note:r[4],source:r[2]==='กรรไกรและมีดโกน'?'https://en.wikipedia.org/wiki/Hair-cutting_shears':r[2]==='ดูแลเครื่องมือ'?'https://www.mrd-pro.co.uk/pages/faqs':sources.tools}));
 const brands=[
 ['WAHL','เครื่องตัด','ปัตตาเลี่ยน เครื่องเก็บขอบ และอุปกรณ์ตัดผม','ชื่อแบรนด์สะกด WAHL ไม่ใช่ WALH','https://wahlusa.com/haircutting-tools','ผู้ผลิต'],
 ['MRD Pro','เครื่องตัด','ปัตตาเลี่ยนและเครื่องมือสำหรับบาร์เบอร์','ตรวจรุ่นและเงื่อนไขประกันกับผู้ขายในประเทศ','https://www.mrd-pro.co.uk/','เว็บไซต์แบรนด์ในสหราชอาณาจักร'],
 ['XILDA','เครื่องตัด','ปัตตาเลี่ยน เช่น Samurai และ Signature','มีคู่มือภาษาไทยให้ตรวจตามรุ่น','https://www.xilda.com/en/','เว็บไซต์แบรนด์'],
 ['UNION','เครื่องตัด','พบรายการ Union Fade master FM007','อ้างอิงรายการจากร้าน Union Beauty ยังไม่ยืนยันข้อมูลผู้ผลิตและประเทศผลิต','https://shop.line.me/%40unionbeauty/product/1003866077','ร้านค้า / ข้อมูลยังจำกัด'],
 ['OHKA SAKURA','กรรไกร','กรรไกรตัดและกรรไกรซอย','ซากูระมีชื่อใกล้กันหลายแบรนด์ รายการนี้หมายถึง OHKA SAKURA','https://www.ohkasakura-th.com/productbrand','เว็บไซต์แบรนด์ในไทย'],
 ['Andis','เครื่องตัด','ปัตตาเลี่ยน เครื่องเก็บขอบ เครื่องโกน และใบมีด','ตรวจชนิดใบมีดและรหัสอะไหล่สำหรับแต่ละรุ่น','https://andis.com/shop/professional-barber/hair-clippers?ID=7','ผู้ผลิต'],
 ['BaBylissPRO','เครื่องตัด','เครื่องมือตัดผมสำหรับบาร์เบอร์','มีหลายซีรีส์ จึงควรเทียบรุ่นจริงและระบบแบตเตอรี่','https://www.babylisspro.com/barber-clippers?sz=36','ผู้ผลิต'],
 ['JRL','เครื่องตัด','เครื่องเก็บขอบและเครื่องมือสำหรับช่าง','ตรวจข้อมูลตลาดและตัวแทนบริการในประเทศที่ซื้อ','https://www.jrlusa.com/collections/trimmers','เว็บไซต์แบรนด์ในสหรัฐฯ'],
 ['JAGUAR Solingen','กรรไกร','กรรไกรตัด ซอย และสร้างเท็กซ์เจอร์','เลือกชนิดกรรไกรจากงาน ด้ามจับ และรุ่นมือซ้ายหรือขวา','https://jaguar-solingen.com/en','ผู้ผลิต']
 ].map(r=>({name:r[0],en:r[0],cat:r[1],description:r[2],note:r[3],source:r[4],sourceLabel:r[5]}));
 const catalogue={learnHair:hairs,learnTools:equipment,learnBrands:brands};
 const titles={learnHair:'คลังทรงผม',learnTools:'อุปกรณ์และเครื่องมือ',learnBrands:'แบรนด์เครื่องมือ'};
 const ui={};
 Object.keys(catalogue).forEach(key=>{PAGES.push([key,'',titles[key]]);ui[key]={query:'',category:'',kind:'',favorites:false}});
 const link=item=>`<a href="${esc(item.source)}" target="_blank" rel="noopener noreferrer">${esc(item.sourceLabel||'อ่านแหล่งอ้างอิง')} ↗</a>`;
 function portrait(item){const im=item.image;return `<figure class="hair-figure"><div class="hair-portrait" role="img" aria-label="ภาพประกอบ ${esc(item.name)} สร้างด้วย AI" style="background-image:url('./${im.sheet}');background-size:${im.cols*100}% ${im.rows*100}%;--hair-x:${im.index%im.cols*100/Math.max(1,im.cols-1)}%;--hair-y:${Math.floor(im.index/im.cols)*100/Math.max(1,im.rows-1)}%"></div><figcaption>ภาพประกอบ AI</figcaption></figure>`}
 function results(){
  const setting=ui[page],items=catalogue[page];if(!items)return;
  const query=setting.query.trim().toLocaleLowerCase();
  const selected=items.filter(x=>(!setting.favorites||window.BarberOps?.personal(x).favorite)&&(!setting.category||x.cat===setting.category)&&(!setting.kind||x.kind===setting.kind)&&[x.name,x.en,x.aliases,x.cat,x.kind,x.description,x.note,window.BarberOps?.personal(x).note].join(' ').toLocaleLowerCase().includes(query));
  document.getElementById('learnCount').textContent=`แสดง ${selected.length} จาก ${items.length} รายการ`;
  document.getElementById('learnResults').innerHTML=selected.length?selected.map(x=>`<article class="learn-item">${x.image!==undefined?portrait(x):''}<div class="learn-copy"><span class="learn-category">${esc(x.cat)}</span>${x.kind?`<span class="learn-kind">${esc(x.kind)}</span>`:''}<h3>${esc(x.name)}</h3>${x.en!==x.name?`<p class="learn-en">${esc(x.en)}</p>`:''}<p>${esc(x.description)}</p>${x.image?`<div class="learn-reference">${link(x)}</div>`:''}${window.BarberOps?.personalHTML(x)||''}<details><summary>อ่านรายละเอียด</summary><p>${esc(x.note)}</p>${x.aliases?`<p class="learn-aliases">ชื่อที่เกี่ยวข้อง: ${esc(x.aliases)}</p>`:''}${!x.image?link(x):''}</details></div></article>`).join(''):'<div class="learn-empty"><h3>ไม่พบรายการที่ค้นหา</h3><p>ลองใช้ชื่อภาษาไทย ภาษาอังกฤษ หรือเปลี่ยนหมวดหมู่</p><button class="btn" onclick="BarberLearning.clear()">ล้างตัวกรอง</button></div>';
 }
 function learningPage(){
  const items=catalogue[page],setting=ui[page];
  const intro=page==='learnHair'?'เปรียบเทียบชื่อ ลักษณะ และภาพทรงผมก่อนคุยกับลูกค้า':page==='learnTools'?'รู้จักหน้าที่ของเครื่องมือและจุดที่ควรตรวจให้ตรงกับงาน':'รวบรวมแบรนด์และลิงก์แหล่งข้อมูล ไม่ใช่การจัดอันดับหรือรับรองร้านค้า';
  document.getElementById('content').innerHTML=`<section class="learning"><header class="learn-heading"><h2>${titles[page]}</h2><p>${intro}</p></header><p class="learn-scope">${page==='learnHair'?'คลังชื่อทรง เทคนิค และการจัดทรง พร้อมภาพประกอบและแหล่งอ้างอิง':page==='learnTools'?'ครอบคลุมเครื่องมือหลัก 24 ประเภทสำหรับร้านตัดผม รายละเอียดการใช้และบำรุงรักษาให้ยึดคู่มือของรุ่นจริง':'ตรวจแหล่งข้อมูล 3 พ.ย. 2569 • ราคาหรือสเปกอาจเปลี่ยนได้ จึงเชื่อมไปยังข้อมูลของแต่ละแบรนด์'}</p><div class="learn-filters"><div class="field"><label for="learnSearch">ค้นหาชื่อหรือคำอธิบาย</label><input type="search" id="learnSearch" placeholder="${page==='learnHair'?'เช่น เฟด, แสกกลาง, Pompadour':page==='learnTools'?'เช่น กรรไกร, Clipper, หวี':'เช่น WAHL, XILDA, ซากูระ'}" value="${esc(setting.query)}"></div><div class="field"><label for="learnCategory">หมวดหมู่</label><select id="learnCategory"><option value="">ทั้งหมด</option>${[...new Set(items.map(x=>x.cat))].map(cat=>`<option ${setting.category===cat?'selected':''}>${esc(cat)}</option>`).join('')}</select></div></div><p id="learnCount" role="status" aria-live="polite"></p><div id="learnResults" class="learn-results ${page==='learnHair'?'hair-results':''}"></div></section>`;
  if(page==='learnHair'){
   document.querySelector('.learn-scope').textContent=`${hairs.length} รายการใน 7 หมวด • แยกทรงตัด เทคนิค และการจัดทรง • ค้นได้ด้วยชื่ออื่น เช่น รากไทร หรือสกินเฮด — ภาพ AI เทียบรูปอ้างอิงก่อนสร้าง ใช้ดูแนวทรง ไม่ใช่มาตรฐานตายตัวหรือรายการครบทุกชื่อในโลก`;
   document.querySelector('.learn-filters').insertAdjacentHTML('beforeend',`<div class="field"><label for="learnKind">ประเภทรายการ</label><select id="learnKind"><option value="">ทุกประเภท</option>${[...new Set(hairs.map(x=>x.kind))].map(kind=>`<option ${setting.kind===kind?'selected':''}>${esc(kind)}</option>`).join('')}</select></div>`);
   document.getElementById('learnKind').addEventListener('change',e=>{setting.kind=e.target.value;results()});
  }
  document.querySelector('.learn-filters').insertAdjacentHTML('afterend',`<label class="check-row"><input id="learnFavorites" type="checkbox" ${setting.favorites?'checked':''}> แสดงเฉพาะรายการโปรดของร้าน</label>`);
  document.getElementById('learnFavorites').addEventListener('change',e=>{setting.favorites=e.target.checked;results()});
  document.getElementById('learnSearch').addEventListener('input',e=>{setting.query=e.target.value;results()});
  document.getElementById('learnCategory').addEventListener('change',e=>{setting.category=e.target.value;results()});results();
 }
 window.BarberLearning={clear(){ui[page].query='';ui[page].category='';ui[page].kind='';ui[page].favorites=false;const fav=document.getElementById('learnFavorites');if(fav)fav.checked=false;document.getElementById('learnSearch').value='';document.getElementById('learnCategory').value='';const kind=document.getElementById('learnKind');if(kind)kind.value='';results();document.getElementById('learnSearch').focus()}};
 const originalRender=render;
 render=function(){if(!catalogue[page])return originalRender();renderNav();updateThemeUI();document.getElementById('pageTitle').textContent='ศูนย์เรียนรู้';learningPage()};
})();
