import{THEME,cellBox}from'./model.js';
const NS='http://www.w3.org/2000/svg';
function clipped(value,maxWidth,mm=3.2,bold=false){const canvas=clipped.canvas??=document.createElement('canvas'),ctx=canvas.getContext('2d');ctx.font=(bold?'600 ':'400 ')+(mm*96/25.4)+'px Prompt';const limit=maxWidth*96/25.4;let t=String(value);if(ctx.measureText(t).width<=limit)return t;const chars=Array.from(t);while(chars.length&&ctx.measureText(chars.join('')+'…').width>limit)chars.pop();return chars.join('')+'…';}
export async function fontsReady(){await Promise.all([document.fonts.load('400 14px Prompt'),document.fonts.load('600 14px Prompt'),document.fonts.load('600 14px Poppins')]);await document.fonts.ready;if(!document.fonts.check('14px Prompt'))throw Error('ยังโหลดฟอนต์ภาษาไทยไม่สำเร็จ กรุณาเปิดออนไลน์ให้โหลดทรัพยากรก่อน');}
function paint(page,draw){const m=page.margin,w=page.width-2*m;
 draw.rect(0,0,page.width,page.height,THEME.white,THEME.white,0);
 draw.text('Barber Manager System',m,16,w,4.1,THEME.navy,true,'left','Poppins');
 draw.text(page.title,m,26,w,5.3,THEME.ink,true);
 draw.rect(m,31,w,0.9,THEME.red,THEME.red,0);
 draw.text(page.meta1,m,39,w*.64,3.3,THEME.ink);
 draw.text(page.period,m+w*.65,39,w*.35,3.1,THEME.ink,false,'right');
 draw.text(page.meta2,m,48,w*.7,3.2,THEME.ink);
 if(page.recorderLine)draw.text(page.recorderLine,m+w*.71,48,w*.29,3.1,THEME.ink,false,'right');
 for(const cell of page.cells){const b=cellBox(page,cell),head=cell.style==='head',sub=cell.style==='subhead';draw.rect(b.x,b.y,b.w,b.h,head?THEME.navy:sub?THEME.pale:THEME.white,head?THEME.white:THEME.line,.18);if(cell.value!=='')draw.text(cell.value,b.x+1,b.y+b.h/2+1.1,b.w-2,page.type===4&&cell.span===1?2.7:head||sub?3.1:3.2,head?THEME.white:THEME.ink,head||sub,cell.style==='number'||head||sub?'center':'left');}
 if(page.type===4){let x=m+page.cols[0];for(let i=0;i<page.staff.length;i++){draw.rect(x, page.tableY,.45,page.headers*page.headerHeight+page.rows*page.rowHeight,THEME.red,THEME.red,0);x+=page.cols.slice(1+4*i,5+4*i).reduce((a,b)=>a+b,0);}}
 const bottom=page.tableY+page.headers*page.headerHeight+page.rows*page.rowHeight;draw.text(page.summary,m,bottom+10,w,3.1,THEME.ink,true);
 draw.text(page.note,m,page.height-18,w,2.7,THEME.ink);
 draw.text(page.footer,m,page.height-11,w,2.8,THEME.ink,false,'right');
}
export function svgPage(page){const svg=document.createElementNS(NS,'svg');svg.setAttribute('viewBox',`0 0 ${page.width} ${page.height}`);svg.setAttribute('width',page.width+'mm');svg.setAttribute('height',page.height+'mm');svg.setAttribute('role','img');svg.setAttribute('aria-label',page.title+' '+page.footer);svg.classList.add('manual-paper',page.width>page.height?'manual-landscape':'manual-portrait');
 paint(page,{rect(x,y,w,h,fill,stroke,line){const r=document.createElementNS(NS,'rect');for(const[k,v]of Object.entries({x,y,width:w,height:h,fill,stroke,'stroke-width':line}))r.setAttribute(k,v);svg.append(r);},text(value,x,y,width,size,color,bold,align='left',font='Prompt'){const t=document.createElementNS(NS,'text');t.setAttribute('x',x+(align==='right'?width:align==='center'?width/2:0));t.setAttribute('y',y);t.setAttribute('font-family',font);t.setAttribute('font-size',size);t.setAttribute('font-weight',bold?'600':'400');t.setAttribute('fill',color);t.setAttribute('text-anchor',align==='right'?'end':align==='center'?'middle':'start');t.textContent=clipped(value,width,size,bold);svg.append(t);}});return svg;
}
export async function jpegPage(page){const scale=288/25.4,canvas=document.createElement('canvas');canvas.width=Math.round(page.width*scale);canvas.height=Math.round(page.height*scale);const ctx=canvas.getContext('2d');ctx.scale(scale,scale);paint(page,{rect(x,y,w,h,fill,stroke,line){ctx.fillStyle=fill;ctx.fillRect(x,y,w,h);if(line){ctx.strokeStyle=stroke;ctx.lineWidth=line;ctx.strokeRect(x,y,w,h);}},text(value,x,y,width,size,color,bold,align='left',font='Prompt'){ctx.font=(bold?'600 ':'400 ')+size+'px '+font;ctx.fillStyle=color;ctx.textAlign=align;ctx.fillText(clipped(value,width,size,bold),x+(align==='right'?width:align==='center'?width/2:0),y);}});const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.96));if(!blob)throw Error('สร้างภาพหน้าเอกสารไม่สำเร็จ');const result={bytes:new Uint8Array(await blob.arrayBuffer()),width:canvas.width,height:canvas.height};canvas.width=canvas.height=0;return result;}
