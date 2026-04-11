let scene,camera,renderer,player;
let enemies=[];
let selectedClass=null;
let money=0;
let iron=0;

function init(){
scene=new THREE.Scene();
camera=new THREE.PerspectiveCamera(75,innerWidth/innerHeight,0.1,1000);
camera.position.set(0,3,6);
renderer=new THREE.WebGLRenderer();
renderer.setSize(innerWidth,innerHeight);
document.body.appendChild(renderer.domElement);

let light=new THREE.DirectionalLight(0xffffff,1);
light.position.set(5,10,5);
scene.add(light);

createTown();
player=createPlayer();
}

function createTown(){
let ground=new THREE.Mesh(
new THREE.PlaneGeometry(60,60),
new THREE.MeshStandardMaterial({color:0x555555})
);
ground.rotation.x=-Math.PI/2;
scene.add(ground);

let shop=new THREE.Mesh(new THREE.BoxGeometry(4,3,4),new THREE.MeshStandardMaterial({color:0x8b5a2b}));
shop.position.set(-6,1.5,0);
scene.add(shop);

let forge=new THREE.Mesh(new THREE.BoxGeometry(3,2,3),new THREE.MeshStandardMaterial({color:0x333333}));
forge.position.set(6,1,0);
scene.add(forge);
}

function createPlayer(){
let g=new THREE.Group();
let body=new THREE.Mesh(new THREE.BoxGeometry(1,1.5,0.5),new THREE.MeshStandardMaterial({color:0x7777ff}));
body.position.y=1;
g.add(body);

if(selectedClass==="mage"){
let hat=new THREE.Mesh(new THREE.ConeGeometry(0.5,1),new THREE.MeshStandardMaterial({color:0x000}));
hat.position.y=2.5;
g.add(hat);
}
if(selectedClass==="demon"){
let horn=new THREE.Mesh(new THREE.ConeGeometry(0.2,0.6),new THREE.MeshStandardMaterial({color:0x000}));
horn.position.set(0.3,2,0);
g.add(horn);
let horn2=horn.clone();
horn2.position.set(-0.3,2,0);
g.add(horn2);
}
if(selectedClass==="beast"){
let ear=new THREE.Mesh(new THREE.ConeGeometry(0.2,0.6),new THREE.MeshStandardMaterial({color:0x663300}));
ear.position.set(0.3,2,0);
g.add(ear);
let ear2=ear.clone();
ear2.position.set(-0.3,2,0);
g.add(ear2);
}

scene.add(g);
return {group:g};
}

function spawnZombie(){
let z=new THREE.Mesh(new THREE.BoxGeometry(1,2,1),new THREE.MeshStandardMaterial({color:0x228822}));
z.position.set((Math.random()-0.5)*20,1,(Math.random()-0.5)*20);
scene.add(z);
enemies.push(z);
}

function selectClass(c){
selectedClass=c;
document.getElementById("start").style.display="none";
init();
for(let i=0;i<5;i++) spawnZombie();
animate();
}

function animate(){
requestAnimationFrame(animate);
renderer.render(scene,camera);
}
