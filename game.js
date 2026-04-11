let scene,camera,renderer,player;
let keys={};
let money=0;
let selectedClass=null;

function startGame(type){
  selectedClass=type;
  document.getElementById("start-screen").style.display="none";
  init();
  animate();
}

function init(){
  scene=new THREE.Scene();

  camera=new THREE.PerspectiveCamera(75,innerWidth/innerHeight,0.1,1000);
  camera.position.set(0,5,10);

  renderer=new THREE.WebGLRenderer();
  renderer.setSize(innerWidth,innerHeight);
  document.body.appendChild(renderer.domElement);

  let light=new THREE.DirectionalLight(0xffffff,1);
  light.position.set(10,20,10);
  scene.add(light);

  createTown();
  player=createPlayer();

  document.addEventListener("keydown",e=>keys[e.key.toLowerCase()]=true);
  document.addEventListener("keyup",e=>keys[e.key.toLowerCase()]=false);
}

function createTown(){
  let ground=new THREE.Mesh(
    new THREE.PlaneGeometry(100,100),
    new THREE.MeshStandardMaterial({color:0x444444})
  );
  ground.rotation.x=-Math.PI/2;
  scene.add(ground);
}

function createPlayer(){
  let g=new THREE.Group();

  let body=new THREE.Mesh(
    new THREE.BoxGeometry(1,2,1),
    new THREE.MeshStandardMaterial({color:0x5555ff})
  );
  body.position.y=1;
  g.add(body);

  if(selectedClass==="mage"){
    let hat=new THREE.Mesh(
      new THREE.ConeGeometry(0.5,1),
      new THREE.MeshStandardMaterial({color:0x000})
    );
    hat.position.y=2.5;
    g.add(hat);
  }

  scene.add(g);
  return g;
}

function updatePlayer(){
  let speed=keys["shift"]?0.25:0.12;

  if(keys["w"])player.position.z-=speed;
  if(keys["s"])player.position.z+=speed;
  if(keys["a"])player.position.x-=speed;
  if(keys["d"])player.position.x+=speed;

  camera.position.x=player.position.x;
  camera.position.z=player.position.z+10;
  camera.lookAt(player.position);
}

function animate(){
  requestAnimationFrame(animate);
  updatePlayer();
  renderer.render(scene,camera);
}
