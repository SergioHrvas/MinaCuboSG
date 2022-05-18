//import * as THREE from 'three';
import * as THREE from '../libs/three.module.js'


class VoxelWorld {
    constructor(options) {
        this.material = options.material;
        this.cellSize = options.cellSize;
        this.tileSize = options.tileSize;
        this.tileTextureWidth = options.tileTextureWidth;
        this.tileTextureHeight = options.tileTextureHeight;
        const { cellSize } = this;
        this.cellSliceSize = cellSize * cellSize;
        this.cell = new Uint8Array(cellSize * cellSize * cellSize);
    }

    computeCellId(x, y, z) {
        const { cellSize } = this;
        const cellX = Math.floor(x / cellSize);
        const cellY = Math.floor(y / cellSize);
        const cellZ = Math.floor(z / cellSize);
        return `${cellX},${cellY},${cellZ}`;
    }

    computeVoxelOffset(x, y, z) {
        const { cellSize, cellSliceSize } = this;
        const voxelX = THREE.MathUtils.euclideanModulo(x, cellSize) | 0;
        const voxelY = THREE.MathUtils.euclideanModulo(y, cellSize) | 0;
        const voxelZ = THREE.MathUtils.euclideanModulo(z, cellSize) | 0;
        return voxelY * cellSliceSize +
            voxelZ * cellSize +
            voxelX;
    }



    getCellForVoxel(x, y, z) { 
        const { cellSize } = this;
        const cellX = Math.floor(x / cellSize);
        const cellY = Math.floor(y / cellSize);
        const cellZ = Math.floor(z / cellSize);
        if (cellX !== 0 || cellY !== 0 || cellZ !== 0) {
            return null;
        }
        return this.cell;
    }



    setVoxel(x, y, z, v) {
        const cell = this.getCellForVoxel(x, y, z);
        if (!cell) {
            return;  // TODO: add a new cell?
        }
        const voxelOffset = this.computeVoxelOffset(x, y, z);
        cell[voxelOffset] = v;
    }



    getVoxel(x, y, z) {
        const cell = this.getCellForVoxel(x, y, z);
        if (!cell) {
            return 0;
        }
        const voxelOffset = this.computeVoxelOffset(x, y, z);
        return cell[voxelOffset];
    }



    generateGeometryDataForCell(cellX, cellY, cellZ) {
        const { cellSize, tileSize, tileTextureWidth, tileTextureHeight } = this;
        const positions = [];
        const normals = [];
        const uvs = [];
        const indices = [];
        const startX = cellX * cellSize;
        const startY = cellY * cellSize;
        const startZ = cellZ * cellSize;

        for (let y = 0; y < cellSize; ++y) {
            const voxelY = startY + y;
            for (let z = 0; z < cellSize; ++z) {
                const voxelZ = startZ + z;
                for (let x = 0; x < cellSize; ++x) {
                    const voxelX = startX + x;
                    const voxel = this.getVoxel(voxelX, voxelY, voxelZ);
                    if (voxel) {
                        // voxel 0 is sky (empty) so for UVs we start at 0
                        const uvVoxel = voxel - 1;
                        // There is a voxel here but do we need faces for it?
                        for (const { dir, corners, uvRow } of VoxelWorld.faces) {
                            const neighbor = this.getVoxel(
                                voxelX + dir[0],
                                voxelY + dir[1],
                                voxelZ + dir[2]);
                            if (!neighbor) {
                                // this voxel has no neighbor in this direction so we need a face.
                                const ndx = positions.length / 3;
                                for (const { pos, uv } of corners) {
                                    positions.push(pos[0] + x, pos[1] + y, pos[2] + z);
                                    normals.push(...dir);
                                    uvs.push(
                                        (uvVoxel + uv[0]) * tileSize / tileTextureWidth,
                                        1 - (uvRow + 1 - uv[1]) * tileSize / tileTextureHeight);
                                }
                                indices.push(
                                    ndx, ndx + 1, ndx + 2,
                                    ndx + 2, ndx + 1, ndx + 3,
                                );
                            }
                        }
                    }
                }
            }
        }

        return {
            positions,
            normals,
            uvs,
            indices,
        };
    }



    //METODOS NUESTROS
    generarChunk(scene) {
        this.cellIdToMesh = {};
        this.neighborOffsets = [
            [0, 0, 0], // self
            [-1, 0, 0], // left
            [1, 0, 0], // right
            [0, -1, 0], // down
            [0, 1, 0], // up
            [0, 0, -1], // back
            [0, 0, 1], // front
        ];

        for (let y = 0; y < this.cellSize; ++y) {
            for (let z = 0; z < this.cellSize; ++z) {
                for (let x = 0; x < this.cellSize; ++x) {
                    /*const height = (Math.sin(x / cellSize * Math.PI * 2) + Math.sin(z / cellSize * Math.PI * 3)) * (cellSize / 6) + (cellSize / 2);
                    if (y < height) {
                      world.setVoxel(x, y, z, randInt(1, 17));
                    }*/
                    this.setVoxel(x, y, z, randInt(1, 17));
                }
            }
        }

        function randInt(min, max) {
            return Math.floor(Math.random() * (max - min) + min);
        }

        this.updateVoxelGeometry(1, 1, 1, scene);  // 0,0,0 will generate 
    }


    updateCellGeometry(x, y, z, scene) {
        const cellX = Math.floor(x / this.cellSize);
        const cellY = Math.floor(y / this.cellSize);
        const cellZ = Math.floor(z / this.cellSize);
        const cellId = this.computeCellId(x, y, z);
        let mesh = this.cellIdToMesh[cellId];
        const geometry = mesh ? mesh.geometry : new THREE.BufferGeometry();

        const { positions, normals, uvs, indices } = this.generateGeometryDataForCell(cellX, cellY, cellZ);
        const positionNumComponents = 3;
        geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), positionNumComponents));
        const normalNumComponents = 3;
        geometry.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(normals), normalNumComponents));
        const uvNumComponents = 2;
        geometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uvs), uvNumComponents));
        geometry.setIndex(indices);
        geometry.computeBoundingSphere();

        if (!mesh) {
            console.log(this.material);
            mesh = new THREE.Mesh(geometry, this.material);
            mesh.name = cellId;
            this.cellIdToMesh[cellId] = mesh;
            scene.add(mesh);
            mesh.position.set(cellX * this.cellSize, cellY * this.cellSize, cellZ * this.cellSize);
        }
    }


    updateVoxelGeometry(x, y, z, scene) {
        const updatedCellIds = {};
        for (const offset of this.neighborOffsets) {
            const ox = x + offset[0];
            const oy = y + offset[1];
            const oz = z + offset[2];
            const cellId = this.computeCellId(ox, oy, oz);
            if (!updatedCellIds[cellId]) {
                updatedCellIds[cellId] = true;
                this.updateCellGeometry(ox, oy, oz, scene);
            }
        }
    }

    // from
    // https://citeseerx.ist.psu.edu/viewdoc/download?doi=10.1.1.42.3443&rep=rep1&type=pdf
    intersectRay(start, end) {
        let dx = end.x - start.x;
        let dy = end.y - start.y;
        let dz = end.z - start.z;
        const lenSq = dx * dx + dy * dy + dz * dz;
        const len = Math.sqrt(lenSq);
    
        dx /= len;
        dy /= len;
        dz /= len;
    
        let t = 0.0;
        let ix = Math.floor(start.x);
        let iy = Math.floor(start.y);
        let iz = Math.floor(start.z);
    
        const stepX = (dx > 0) ? 1 : -1;
        const stepY = (dy > 0) ? 1 : -1;
        const stepZ = (dz > 0) ? 1 : -1;
    
        const txDelta = Math.abs(1 / dx);
        const tyDelta = Math.abs(1 / dy);
        const tzDelta = Math.abs(1 / dz);
    
        const xDist = (stepX > 0) ? (ix + 1 - start.x) : (start.x - ix);
        const yDist = (stepY > 0) ? (iy + 1 - start.y) : (start.y - iy);
        const zDist = (stepZ > 0) ? (iz + 1 - start.z) : (start.z - iz);
    
        // location of nearest voxel boundary, in units of t
        let txMax = (txDelta < Infinity) ? txDelta * xDist : Infinity;
        let tyMax = (tyDelta < Infinity) ? tyDelta * yDist : Infinity;
        let tzMax = (tzDelta < Infinity) ? tzDelta * zDist : Infinity;
    
        let steppedIndex = -1;
    
        // main loop along raycast vector
        while (t <= len) {
          const voxel = this.getVoxel(ix, iy, iz);
          if (voxel) {
            return {
              position: [
                start.x + t * dx,
                start.y + t * dy,
                start.z + t * dz,
              ],
              normal: [
                steppedIndex === 0 ? -stepX : 0,
                steppedIndex === 1 ? -stepY : 0,
                steppedIndex === 2 ? -stepZ : 0,
              ],
              voxel,
            };
          }
    
          // advance t to next nearest voxel boundary
          if (txMax < tyMax) {
            if (txMax < tzMax) {
              ix += stepX;
              t = txMax;
              txMax += txDelta;
              steppedIndex = 0;
            } else {
              iz += stepZ;
              t = tzMax;
              tzMax += tzDelta;
              steppedIndex = 2;
            }
          } else {
            if (tyMax < tzMax) {
              iy += stepY;
              t = tyMax;
              tyMax += tyDelta;
              steppedIndex = 1;
            } else {
              iz += stepZ;
              t = tzMax;
              tzMax += tzDelta;
              steppedIndex = 2;
            }
          }
        }
        return null;
      }    
} 
VoxelWorld.faces = [
    { // left
        uvRow: 0,
        dir: [-1, 0, 0,],
        corners: [
            { pos: [0, 1, 0], uv: [0, 1], },
            { pos: [0, 0, 0], uv: [0, 0], },
            { pos: [0, 1, 1], uv: [1, 1], },
            { pos: [0, 0, 1], uv: [1, 0], },
        ],
    },
    { // right
        uvRow: 0,
        dir: [1, 0, 0,],
        corners: [
            { pos: [1, 1, 1], uv: [0, 1], },
            { pos: [1, 0, 1], uv: [0, 0], },
            { pos: [1, 1, 0], uv: [1, 1], },
            { pos: [1, 0, 0], uv: [1, 0], },
        ],
    },
    { // bottom
        uvRow: 1,
        dir: [0, -1, 0,],
        corners: [
            { pos: [1, 0, 1], uv: [1, 0], },
            { pos: [0, 0, 1], uv: [0, 0], },
            { pos: [1, 0, 0], uv: [1, 1], },
            { pos: [0, 0, 0], uv: [0, 1], },
        ],
    },
    { // top
        uvRow: 2,
        dir: [0, 1, 0,],
        corners: [
            { pos: [0, 1, 1], uv: [1, 1], },
            { pos: [1, 1, 1], uv: [0, 1], },
            { pos: [0, 1, 0], uv: [1, 0], },
            { pos: [1, 1, 0], uv: [0, 0], },
        ],
    },
    { // back
        uvRow: 0,
        dir: [0, 0, -1,],
        corners: [
            { pos: [1, 0, 0], uv: [0, 0], },
            { pos: [0, 0, 0], uv: [1, 0], },
            { pos: [1, 1, 0], uv: [0, 1], },
            { pos: [0, 1, 0], uv: [1, 1], },
        ],
    },
    { // front
        uvRow: 0,
        dir: [0, 0, 1,],
        corners: [
            { pos: [0, 0, 1], uv: [0, 0], },
            { pos: [1, 0, 1], uv: [1, 0], },
            { pos: [0, 1, 1], uv: [0, 1], },
            { pos: [1, 1, 1], uv: [1, 1], },
        ],
    },
];


function main() {
    const canvas = document.querySelector('#c');
    const renderer = new THREE.WebGLRenderer({ canvas });

    const cellSize = 32;

    const tileSize = 16;
    const tileTextureWidth = 256;
    const tileTextureHeight = 64;
    const loader = new THREE.TextureLoader();
    const texture = loader.load('https://threejs.org/manual/examples/resources/images/minecraft/flourish-cc-by-nc-sa.png', render);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;

    const world = new VoxelWorld({
        cellSize,
        tileSize,
        tileTextureWidth,
        tileTextureHeight,
    });

    const material = new THREE.MeshLambertMaterial({
        map: texture,
        side: THREE.DoubleSide,
        alphaTest: 0.1,
        transparent: true,
    });

    const cellIdToMesh = {};
    function updateCellGeometry(x, y, z) {
        const cellX = Math.floor(x / cellSize);
        const cellY = Math.floor(y / cellSize);
        const cellZ = Math.floor(z / cellSize);
        const cellId = world.computeCellId(x, y, z);
        let mesh = cellIdToMesh[cellId];
        const geometry = mesh ? mesh.geometry : new THREE.BufferGeometry();

        const { positions, normals, uvs, indices } = world.generateGeometryDataForCell(cellX, cellY, cellZ);
        const positionNumComponents = 3;
        geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), positionNumComponents));
        const normalNumComponents = 3;
        geometry.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(normals), normalNumComponents));
        const uvNumComponents = 2;
        geometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uvs), uvNumComponents));
        geometry.setIndex(indices);
        geometry.computeBoundingSphere();

        if (!mesh) {
            mesh = new THREE.Mesh(geometry, material);
            mesh.name = cellId;
            cellIdToMesh[cellId] = mesh;
            scene.add(mesh);
            mesh.position.set(cellX * cellSize, cellY * cellSize, cellZ * cellSize);
        }
    }

    const neighborOffsets = [
        [0, 0, 0], // self
        [-1, 0, 0], // left
        [1, 0, 0], // right
        [0, -1, 0], // down
        [0, 1, 0], // up
        [0, 0, -1], // back
        [0, 0, 1], // front
    ];
    function updateVoxelGeometry(x, y, z) {
        const updatedCellIds = {};
        for (const offset of neighborOffsets) {
            const ox = x + offset[0];
            const oy = y + offset[1];
            const oz = z + offset[2];
            const cellId = world.computeCellId(ox, oy, oz);
            if (!updatedCellIds[cellId]) {
                updatedCellIds[cellId] = true;
                updateCellGeometry(ox, oy, oz);
            }
        }
    }

    for (let y = 0; y < cellSize; ++y) {
        for (let z = 0; z < cellSize; ++z) {
            for (let x = 0; x < cellSize; ++x) {
                const height = (Math.sin(x / cellSize * Math.PI * 2) + Math.sin(z / cellSize * Math.PI * 3)) * (cellSize / 6) + (cellSize / 2);
                if (y < height) {
                    world.setVoxel(x, y, z, randInt(1, 17));
                }
            }
        }
    }

    function randInt(min, max) {
        return Math.floor(Math.random() * (max - min) + min);
    }

    updateVoxelGeometry(1, 1, 1);  // 0,0,0 will generate
}


export { VoxelWorld }