import { MeshPhongMaterial } from '../../libs/three.module.js';
import { Cubo } from '../Cubo.js';
import * as THREE from '../../libs/three.module.js'

class Tierra extends Cubo {
  constructor() {
    super();
    const loader = new THREE.TextureLoader();

    const textura = [
      new THREE.MeshBasicMaterial({map: loader.load("./texturas/tierra/tierra.png")}),
      new THREE.MeshBasicMaterial({map: loader.load("./texturas/tierra/tierra.png")}),
      new THREE.MeshBasicMaterial({map: loader.load("./texturas/tierra/tierra.png")}),
      new THREE.MeshBasicMaterial({map: loader.load("./texturas/tierra/tierra.png")}),
      new THREE.MeshBasicMaterial({map: loader.load("./texturas/tierra/tierra.png")}),
      new THREE.MeshBasicMaterial({map: loader.load("./texturas/tierra/tierra.png")}),
    ];
    
    this.material = textura;

  }

  createGUI(gui, titleGui) {

  }

  update(movimiento) {

  }
}

export { Tierra };
