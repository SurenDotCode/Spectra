import {parentPort,workerData} from 'node:worker_threads';
import {getDocument} from 'pdfjs-dist/legacy/build/pdf.mjs';
let document;
try{document=await getDocument({data:Uint8Array.from(workerData),isEvalSupported:false,useSystemFonts:false,disableFontFace:true,stopAtErrors:true}).promise;if(document.numPages>20)throw new Error('Page limit');let text='';for(let i=1;i<=document.numPages;i++){const page=await document.getPage(i);const content=await page.getTextContent();text+=content.items.filter(item=>'str' in item).map(item=>item.str).join(' ')+'\n';if(text.length>20000)break;}parentPort.postMessage({text:text.slice(0,20000)});}catch{parentPort.postMessage({error:'PDF could not be safely read. Upload a text export instead.'});}finally{await document?.destroy();}
