const video = document.getElementById("video");
const previewCanvas = document.getElementById("previewCanvas");
const stage = document.querySelector(".stage");
const startBtn = document.getElementById("startBtn");
const captureBtn = document.getElementById("captureBtn");
const switchBtn = document.getElementById("switchBtn");
const againBtn = document.getElementById("againBtn");
const downloadBtn = document.getElementById("downloadBtn");
const statusEl = document.getElementById("status");
const loading = document.getElementById("loading");
const guide = document.getElementById("guide");

let stream = null;
let net = null;
let facingMode = "environment";
let busy = false;

const background = new Image();
background.src = "assets/mercado-madalena.jpg";
background.onerror = () => {
  // O pacote já vem com um fundo ilustrativo para teste.
  // Depois, coloque a foto real em assets/mercado-madalena.jpg.
  background.onerror = null;
  background.src = "assets/mercado-madalena-placeholder.svg";
};

function setStatus(text){ statusEl.textContent = text; }

async function loadModel(){
  if(net) return;
  setStatus("Carregando o recorte inteligente...");
  loading.classList.remove("hidden");
  await tf.ready();
  net = await bodyPix.load({
    architecture: "MobileNetV1",
    outputStride: 16,
    multiplier: 0.75,
    quantBytes: 2
  });
  loading.classList.add("hidden");
}

async function startCamera(){
  try{
    if(!window.isSecureContext && location.hostname !== "localhost"){
      setStatus("O site precisa estar em HTTPS para usar a câmera.");
      return;
    }

    if(stream) stream.getTracks().forEach(t => t.stop());

    stream = await navigator.mediaDevices.getUserMedia({
      video:{
        facingMode:{ideal:facingMode},
        width:{ideal:1080},
        height:{ideal:1440}
      },
      audio:false
    });

    video.srcObject = stream;
    await video.play();

    await loadModel();

    startBtn.classList.add("hidden");
    captureBtn.classList.remove("hidden");
    switchBtn.classList.remove("hidden");
    guide.classList.remove("hidden");
    setStatus("Pronto! Posicione a pessoa dentro da área.");
  }catch(err){
    console.error(err);
    loading.classList.add("hidden");
    setStatus("Não consegui abrir a câmera. Verifique a permissão do navegador e tente novamente.");
  }
}

async function capture(){
  if(busy || !net || video.readyState < 2) return;
  busy = true;
  captureBtn.disabled = true;
  setStatus("Processando a foto...");
  guide.classList.add("hidden");

  const w = video.videoWidth;
  const h = video.videoHeight;
  const work = document.createElement("canvas");
  work.width = w;
  work.height = h;
  const ctx = work.getContext("2d", {willReadFrequently:true});

  // Fundo primeiro.
  if(background.complete && background.naturalWidth){
    drawCover(ctx, background, 0, 0, w, h);
  }else{
    const g = ctx.createLinearGradient(0,0,0,h);
    g.addColorStop(0,"#dfeadf"); g.addColorStop(1,"#a9c2aa");
    ctx.fillStyle=g; ctx.fillRect(0,0,w,h);
    ctx.fillStyle="#173f2b"; ctx.font=`bold ${Math.max(28,w/20)}px sans-serif`;
    ctx.textAlign="center"; ctx.fillText("MERCADO DA MADALENA",w/2,h*.12);
  }

  // Segmentação de pessoa no navegador.
  const segmentation = await net.segmentPerson(video,{
    flipHorizontal:false,
    internalResolution:"medium",
    segmentationThreshold:0.72,
    maxDetections:1
  });

  const personCanvas = document.createElement("canvas");
  personCanvas.width=w; personCanvas.height=h;
  const pc = personCanvas.getContext("2d");
  pc.drawImage(video,0,0,w,h);
  const image = pc.getImageData(0,0,w,h);

  // Suaviza a máscara com uma pequena margem para reduzir serrilhado.
  const mask = new Uint8ClampedArray(w*h);
  for(let i=0;i<segmentation.data.length;i++){
    mask[i]=segmentation.data[i] ? 255 : 0;
  }
  const out = pc.createImageData(w,h);
  for(let i=0,p=0;i<mask.length;i++,p+=4){
    out.data[p]=image.data[p];
    out.data[p+1]=image.data[p+1];
    out.data[p+2]=image.data[p+2];
    out.data[p+3]=mask[i];
  }
  pc.clearRect(0,0,w,h);
  pc.putImageData(out,0,0);

  // Encontra o enquadramento da pessoa e a reduz para dar sensação
  // de maior distância, deixando o Mercado da Madalena mais evidente.
  let minX=w, minY=h, maxX=-1, maxY=-1;
  const step=3;
  for(let y=0;y<h;y+=step){
    for(let x=0;x<w;x+=step){
      if(mask[y*w+x]){
        if(x<minX) minX=x;
        if(x>maxX) maxX=x;
        if(y<minY) minY=y;
        if(y>maxY) maxY=y;
      }
    }
  }

  if(maxX>=0){
    const padX=Math.round((maxX-minX)*0.06);
    const padY=Math.round((maxY-minY)*0.04);
    minX=Math.max(0,minX-padX); maxX=Math.min(w-1,maxX+padX);
    minY=Math.max(0,minY-padY); maxY=Math.min(h-1,maxY+padY);

    const personW=maxX-minX+1;
    const personH=maxY-minY+1;
    const personCrop=document.createElement("canvas");
    personCrop.width=personW;
    personCrop.height=personH;
    const cropCtx=personCrop.getContext("2d");
    cropCtx.drawImage(personCanvas,minX,minY,personW,personH,0,0,personW,personH);

    // 0.68 = pessoa ocupa aproximadamente 68% da altura que ocuparia
    // na captura original. Assim o fundo aparece bem mais.
    const scale=0.68;
    const drawW=personW*scale;
    const drawH=personH*scale;

    // Mantém a pessoa centralizada e apoiada na parte inferior.
    const dx=(w-drawW)/2;
    const bottomMargin=Math.round(h*0.07);
    const dy=Math.max(0,h-bottomMargin-drawH);

    ctx.drawImage(personCrop,dx,dy,drawW,drawH);
  }

  // Moldura e identificação do projeto.
  ctx.fillStyle="rgba(255,255,255,.92)";
  ctx.fillRect(0,h-86,w,86);
  ctx.fillStyle="#173f2b";
  ctx.font=`800 ${Math.max(22,w/25)}px system-ui`;
  ctx.textAlign="left";
  ctx.fillText("VOCÊ COM A GENTE NO MERCADO",28,h-48);
  ctx.font=`500 ${Math.max(15,w/48)}px system-ui`;
  ctx.fillText("Feira de Ciências • Mercado da Madalena",28,h-20);

  previewCanvas.width=w; previewCanvas.height=h;
  previewCanvas.getContext("2d").drawImage(work,0,0);
  previewCanvas.style.display="block";
  video.style.display="none";

  const data = previewCanvas.toDataURL("image/jpeg",0.94);
  downloadBtn.href=data;
  downloadBtn.classList.remove("hidden");
  againBtn.classList.remove("hidden");
  captureBtn.classList.add("hidden");
  switchBtn.classList.add("hidden");
  setStatus("Foto pronta! Toque em “Salvar foto”.");
  busy=false;
  captureBtn.disabled=false;
}

function drawCover(ctx,img,x,y,w,h){
  const scale=Math.max(w/img.naturalWidth,h/img.naturalHeight);
  const sw=img.naturalWidth*scale, sh=img.naturalHeight*scale;
  ctx.drawImage(img,x+(w-sw)/2,y+(h-sh)/2,sw,sh);
}

async function again(){
  previewCanvas.style.display="none";
  video.style.display="block";
  downloadBtn.classList.add("hidden");
  againBtn.classList.add("hidden");
  switchBtn.classList.remove("hidden");
  captureBtn.classList.remove("hidden");
  guide.classList.remove("hidden");
  setStatus("Pronto! Posicione a pessoa dentro da área.");
}

async function switchCamera(){
  facingMode = facingMode==="environment" ? "user" : "environment";
  await startCamera();
}

startBtn.addEventListener("click",startCamera);
captureBtn.addEventListener("click",capture);
againBtn.addEventListener("click",again);
switchBtn.addEventListener("click",switchCamera);

window.addEventListener("beforeunload",()=>{
  if(stream) stream.getTracks().forEach(t=>t.stop());
});
