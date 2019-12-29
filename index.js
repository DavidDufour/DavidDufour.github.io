"use strict";

import Stats from 'https://rawgit.com/mrdoob/three.js/dev/examples/jsm/libs/stats.module.js';

import { OrbitControls } from 'https://rawgit.com/mrdoob/three.js/dev/examples/jsm/controls/OrbitControls.js';
import { TGALoader } from 'https://rawgit.com/mrdoob/three.js/dev/examples/jsm/loaders/TGALoader.js';
import { GLTFLoader } from 'https://rawgit.com/mrdoob/three.js/dev/examples/jsm/loaders/GLTFLoader.js';
import { FBXLoader } from 'https://rawgit.com/mrdoob/three.js/dev/examples/jsm/loaders/FBXLoader.js';
// Pixelation post-processing
import { GUI } from 'https://rawgit.com/mrdoob/three.js/dev/examples/jsm/libs/dat.gui.module.js';
import { EffectComposer } from 'https://rawgit.com/mrdoob/three.js/dev/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'https://rawgit.com/mrdoob/three.js/dev/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'https://rawgit.com/mrdoob/three.js/dev/examples/jsm/postprocessing/ShaderPass.js';
import { ColorShader } from './jsm/shaders/ColorShader.js';
import { OutlinePass } from './jsm/postprocessing/OutlinePass.js';
import { PixelShader } from './jsm/shaders/PixelShader.js';

let container, stats;

let camera, scene, renderer, effect, gui, composer;
let particleLight;
let colorPass, pixelPass, params;
let tanModel, moveRight, moveLeft;

function init() {
    // HTML element containing the game window
    container = document.getElementById( 'game' );

    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color( 0x555555 );

    // Camera
    camera = new THREE.PerspectiveCamera( 30, container.clientWidth / container.clientHeight, 1, 6000 );
    camera.position.set( 0.0, 0, 800 );

    // WebGL renderer
    renderer = new THREE.WebGLRenderer( { 
        alpha: false,
        antialias: false
    } );
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( container.clientWidth, container.clientHeight );
    renderer.autoClear = false;
    // renderer.setClearColor( 0xFFFFFF, 1.0 );
    // renderer.setClearAlpha( 0.0 );
    // renderer.gammaInput = true;
    // renderer.gammaOutput = true;
    container.appendChild( renderer.domElement );

    // Stats (FPS, ...)
    stats = new Stats();
    container.appendChild( stats.dom );

    // Orbital controls
    let controls = new OrbitControls( camera, renderer.domElement );

    // Handles resizing of windows
    window.addEventListener( 'resize', onWindowResize, false );

    // Lights
    // TODO: Add slider for lights
    scene.add( new THREE.AmbientLight( 0x222222 ) );

    let directionalLight = new THREE.DirectionalLight( 0xFFFFFF, 1 );
    directionalLight.position.set( 1, 1, 1 ).normalize();
    scene.add( directionalLight );

    // Post processing
    composer = new EffectComposer( renderer );
    composer.addPass( new RenderPass( scene, camera ) );

    // Hue & Saturation shifting in shadows and highlights
    colorPass = new ShaderPass( ColorShader );
    composer.addPass( colorPass );

    // Outline
    let stageOutline = new OutlinePass( new THREE.Vector2( window.innerWidth, window.innerHeight ), scene, camera );
    stageOutline.enabled = false;
    stageOutline.edgeStrength = 10;
    stageOutline.edgeGlow = 0;
    stageOutline.edgeThickness = 1;
    stageOutline.visibleEdgeColor.set('#000000');
    stageOutline.hiddenEdgeColor.set('#000000');
    stageOutline.selectedObjects = [];
    composer.addPass( stageOutline );

    let redTeamOutline = new OutlinePass( new THREE.Vector2( window.innerWidth, window.innerHeight ), scene, camera );
    redTeamOutline.enabled = false;
    redTeamOutline.edgeStrength = 10;
    redTeamOutline.edgeGlow = 0;
    redTeamOutline.edgeThickness = 1;
    redTeamOutline.visibleEdgeColor.set('#FF0000');
    redTeamOutline.hiddenEdgeColor.set('#000000');
    redTeamOutline.selectedObjects = [];
    composer.addPass( redTeamOutline );

    let blueTeamOutline = new OutlinePass( new THREE.Vector2( window.innerWidth, window.innerHeight ), scene, camera );
    blueTeamOutline.enabled = false;
    blueTeamOutline.edgeStrength = 10;
    blueTeamOutline.edgeGlow = 0;
    blueTeamOutline.edgeThickness = 1;
    blueTeamOutline.visibleEdgeColor.set('#0000FF');
    blueTeamOutline.hiddenEdgeColor.set('#000000');
    blueTeamOutline.selectedObjects = [];
    composer.addPass( blueTeamOutline );

    // Pixelization
    pixelPass = new ShaderPass( PixelShader );
    pixelPass.uniforms[ "resolution" ].value = new THREE.Vector2( window.innerWidth, window.innerHeight );
    pixelPass.uniforms[ "resolution" ].value.multiplyScalar( window.devicePixelRatio );
    pixelPass.uniforms[ "pixelSize" ].value = 4;
    composer.addPass( pixelPass );

    // GUI for editing parameters
    params = {
        postprocessing: true,
        backgroundColor: '#111111',
        hueShift: true,
        pixelize: true,
        pixelSize: 4,
        gradientMap: 'fourTone',
        specular: '#111111',
        reflectivity: 0.2,
        shininess: 0.0,
        outline: false,
        edgeStrength: 10,
        edgeGlow: 0.0,
        edgeThickness: 1,
        visibleEdgeColor: '#000000',
        hiddenEdgeColor: '#000000'
    };

    // Toon material
    let threeTone = new THREE.TextureLoader().load( 'textures/threeTone.jpg' );
    let fourTone = new THREE.TextureLoader().load( 'textures/fourTone.jpg' );
    let fiveTone = new THREE.TextureLoader().load( 'textures/fiveTone.jpg' );
    let sixTone = new THREE.TextureLoader().load( 'textures/sixTone.jpg' );

    threeTone.minFilter = fourTone.minFilter = fiveTone.minFilter = sixTone.minFilter = THREE.NearestFilter;
    threeTone.magFilter = fourTone.magFilter = fiveTone.magFilter = sixTone.magFilter = THREE.NearestFilter;

    // Spheres
    let geometry = new THREE.SphereGeometry( 32, 32, 32 );
    // The pixel shader removes the need for MeshToonMaterial as it creates brightness steps
    function sphereMaterial(color) { 
        return new THREE.MeshToonMaterial( {
            color: color,
            gradientMap: fiveTone,
            specular: '#111111',
            reflectivity: 0.2,
            shininess: 0
        } );
    }

    let sphere = new THREE.Mesh( geometry, sphereMaterial(0xCC3D3D) );
    sphere.position.x += -90*2.5;
    sphere.position.y += 200;
    stageOutline.selectedObjects.push(sphere);
    scene.add( sphere );

    sphere = new THREE.Mesh( geometry, sphereMaterial(0xCC6D3D) );
    sphere.position.x += -60*2.5;
    sphere.position.y += 200;
    stageOutline.selectedObjects.push(sphere);
    scene.add( sphere );

    sphere = new THREE.Mesh( geometry, sphereMaterial(0xCC9C3D) );
    sphere.position.x += -30*2.5;
    sphere.position.y += 200;
    stageOutline.selectedObjects.push(sphere);
    scene.add( sphere );

    sphere = new THREE.Mesh( geometry, sphereMaterial(0x55CC3D) );
    sphere.position.x += 0*2.5;
    sphere.position.y += 200;
    stageOutline.selectedObjects.push(sphere);
    scene.add( sphere );

    sphere = new THREE.Mesh( geometry, sphereMaterial(0x3D85CC) );
    sphere.position.x += 30*2.5;
    sphere.position.y += 200;
    stageOutline.selectedObjects.push(sphere);
    scene.add( sphere );

    sphere = new THREE.Mesh( geometry, sphereMaterial(0x903DCC) );
    sphere.position.x += 60*2.5;
    sphere.position.y += 200;
    stageOutline.selectedObjects.push(sphere);
    scene.add( sphere );

    // Skybox
    let materialArray = [];
    let texture_ft = new TGALoader().load( 'textures/arrakisday/arrakisday_ft.tga');
    texture_ft.center.set( 0.5, 0.5 );
    texture_ft.rotation = Math.PI;
    let texture_bk = new TGALoader().load( 'textures/arrakisday/arrakisday_bk.tga');
    texture_bk.center.set( 0.5, 0.5 );
    texture_bk.rotation = Math.PI;
    let texture_up = new TGALoader().load( 'textures/arrakisday/arrakisday_up.tga');
    texture_up.center.set( 0.5, 0.5 );
    texture_up.rotation = Math.PI / 2;
    let texture_dn = new TGALoader().load( 'textures/arrakisday/arrakisday_dn.tga');
    texture_dn.center.set( 0.5, 0.5 );
    texture_dn.rotation = Math.PI / 2;
    let texture_rt = new TGALoader().load( 'textures/arrakisday/arrakisday_rt.tga');
    texture_rt.center.set( 0.5, 0.5 );
    texture_rt.rotation = Math.PI;
    let texture_lf = new TGALoader().load( 'textures/arrakisday/arrakisday_lf.tga');
    texture_lf.center.set( 0.5, 0.5 );
    texture_lf.rotation = Math.PI;
    materialArray.push(new THREE.MeshBasicMaterial( { map: texture_lf }));
    materialArray.push(new THREE.MeshBasicMaterial( { map: texture_rt }));
    materialArray.push(new THREE.MeshBasicMaterial( { map: texture_up }));
    materialArray.push(new THREE.MeshBasicMaterial( { map: texture_dn }));
    materialArray.push(new THREE.MeshBasicMaterial( { map: texture_bk }));
    materialArray.push(new THREE.MeshBasicMaterial( { map: texture_ft }));

    for (let i = 0; i < 6; i++) {
        materialArray[i].side = THREE.BackSide;
    }
    let skyboxGeo = new THREE.BoxGeometry( 5000, 5000, 5000);
    let skybox = new THREE.Mesh( skyboxGeo, materialArray );
    scene.add( skybox ); 

    // Desert model
    let fbxLoader = new FBXLoader();
    fbxLoader.load( 'models/desert/Desert.fbx',
        function( fbx ) {
            fbx.traverse(
                function( child ) {
                    if ( child.isMesh ) {
                        child.castShadow = true;
                        child.receiveShadow = true;

                        child.scale.set(190,190,190);

                        child.material = new THREE.MeshToonMaterial( {
                            gradientMap: fourTone,
                            specular: '#111111',
                            reflectivity: 0.2,
                            shininess: 0
                        } );
                        let imgTexture = new THREE.TextureLoader().load( 'models/desert/Desert_' + child.name + '.png' );
                        imgTexture.wrapS = imgTexture.wrapT = THREE.RepeatWrapping;
                        child.material.map = imgTexture;
                        let bmpTexture = new THREE.TextureLoader().load( 'models/desert/Desert_' + child.name + '_nrm.png' );
                        bmpTexture.wrapS = bmpTexture.wrapT = THREE.RepeatWrapping;
                        child.material.bumpMap = bmpTexture;
                    }
                }
            );
            scene.add( fbx );
            stageOutline.selectedObjects.push(fbx);
            fbx.rotateX(THREE.Math.degToRad(-93));
            fbx.translateY( 290 );
            fbx.translateZ( -60 );
        },
        function( xhr ){
            console.log( (xhr.loaded / xhr.total * 100) + "% loaded")
        },
        function( err ){
            console.error( "Error loading 'Desert.fbx'")
        }
    );

    // Tan model
    let tanMesh;
    fbxLoader = new FBXLoader();
    fbxLoader.load( 'models/Tan/Tan Version 0.0/Tan FBX 10.fbx',
        function( fbx ) {
            fbx.traverse(
                function( child ) {
                    if ( child.isMesh ) {
                        child.castShadow = true;
                        child.receiveShadow = true;

                        tanMesh = child;
                        child.scale.set(100,100,100);

                        child.material = new THREE.MeshToonMaterial( {
                            gradientMap: fourTone,
                            specular: '#111111',
                            reflectivity: 0.2,
                            shininess: 0
                        } );
                        let imgTexture = new THREE.TextureLoader().load( "models/Tan/Tan Version 0.0/Tan FBX 10_Tan.png" );
                        imgTexture.wrapS = imgTexture.wrapT = THREE.RepeatWrapping;
                        child.material.map = imgTexture;
                        let bmpTexture = new THREE.TextureLoader().load( "models/Tan/Tan Version 0.0/Tan FBX 10_Tan_nrm.png" );
                        bmpTexture.wrapS = bmpTexture.wrapT = THREE.RepeatWrapping;
                        child.material.bumpMap = bmpTexture;
                    }
                }
            );
            scene.add( fbx );
            blueTeamOutline.selectedObjects.push(fbx);
            fbx.rotateX(THREE.Math.degToRad(-90));
            fbx.rotateY(THREE.Math.degToRad(0));
            fbx.rotateZ(THREE.Math.degToRad(-100));
            
            tanModel = fbx;
        },
        function( xhr ){
            console.log( (xhr.loaded / xhr.total * 100) + "% loaded")
        },
        function( err ){
            console.error( "Error loading 'Tan FBX 10.fbx'")
        }
    );

    // Fiverr model
    let fiverrLoader = new FBXLoader();
    fiverrLoader.load( 'models/Tan/Tan Version 1.3/export - Copie.fbx',
        function( tanFbx ) {
            tanFbx.traverse(
                function( child ) {
                    if ( child.isMesh ) {
                        console.log(child)
                        child.castShadow = true;
                        child.receiveShadow = true;

                        child.scale.set(0.9,0.9,0.9);

                        child.material = new THREE.MeshToonMaterial( {
                            gradientMap: fourTone,
                            specular: '#111111',
                            reflectivity: 0.2,
                            shininess: 0
                        } );

                        let imgTexture = new THREE.TextureLoader().load( "models/Tan/Tan Version 1.3/" + child.name + "_TXTR.jpg" );
                        imgTexture.wrapS = imgTexture.wrapT = THREE.RepeatWrapping;
                        child.material.map = imgTexture;
                        let bmpTexture = new THREE.TextureLoader().load( "models/Tan/Tan Version 1.3/" + child.name + "_NM.jpg" );
                        bmpTexture.wrapS = bmpTexture.wrapT = THREE.RepeatWrapping;
                        child.material.normalMap = bmpTexture;
                        // These files probably aren't needed and are quite large
                        // let dispTexture = new THREE.TextureLoader().load( "models/Tan/Tan Version 1.3/" + child.name + "_DM.png" );
                        // dispTexture.wrapS = dispTexture.wrapT = THREE.RepeatWrapping;
                        // child.material.displacementMap = dispTexture;
                    }
                }
            );
            redTeamOutline.selectedObjects.push(tanFbx);
            tanFbx.rotateX(THREE.Math.degToRad(0));
            tanFbx.rotateY(THREE.Math.degToRad(180));
            tanFbx.rotateZ(THREE.Math.degToRad(180));
            tanFbx.translateX( -150 );
            tanFbx.translateY( 95 );
            tanFbx.translateZ( 0 );
            scene.add( tanFbx );
        },
        function( xhr ){
            console.log( (xhr.loaded / xhr.total * 100) + "% loaded")
        },
        function( err ){
            console.error( "Error loading 'Tan FBX 10.fbx'")
        }
    );

    gui = new GUI();
    gui.closed = true;
    gui.add( params, 'postprocessing' );
    gui.addColor( params, 'backgroundColor' ).onChange( function ( value ) {
        scene.background = new THREE.Color( value );
    } );

    let folder = gui.addFolder( 'Cell Shading' );
    folder.add( params, 'gradientMap', ['threeTone', 'fourTone', 'fiveTone', 'sixTone'] ).onChange( function (value) {
        toonMaterial.gradientMap = eval(value);
    } );
    folder.addColor( params, 'specular' ).onChange( function ( value ) {
        tanMesh.material.specular.set( value );
    } );
    folder.add( params, 'shininess' ).min( 0 ).max( 256 ).step( 1 ).onChange( function ( value ) {
        tanMesh.material.shininess = value;
    } );
    folder.add( params, 'reflectivity' ).min( 0 ).max( 1 ).step( 0.1 ).onChange( function ( value ) {
        tanMesh.material.reflectivity = value;
    } );

    folder = gui.addFolder( 'Hue Shift' );
    folder.add( params, 'hueShift' ).onChange( function ( value ) {
        colorPass.enabled = Boolean( value );
    } );

    folder = gui.addFolder( 'Pixel Art' );
    folder.add( params, 'pixelize' ).onChange( function ( value ) {
        pixelPass.enabled = Boolean( value );
    } );
    folder.add( params, 'pixelSize' ).min( 2 ).max( 32 ).step( 2 ).onChange( function ( value ) {
        pixelPass.uniforms[ "pixelSize" ].value = params.pixelSize;
    } );

    folder = gui.addFolder( 'Outline' );
    folder.add( params, 'outline' ).onChange( function ( value ) {
        redTeamOutline.enabled = Boolean( value );
        blueTeamOutline.enabled = Boolean( value );
        stageOutline.enabled = Boolean( value );
    } );
    folder.add( params, 'edgeStrength', 0.01, 10 ).onChange( function ( value ) {
        redTeamOutline.edgeStrength = Number( value );
        blueTeamOutline.edgeStrength = Number( value );
        stageOutline.edgeStrength = Number( value );
    } );
    folder.add( params, 'edgeGlow', 0.0, 1 ).onChange( function ( value ) {
        redTeamOutline.edgeGlow = Number( value );
        blueTeamOutline.edgeGlow = Number( value );
        stageOutline.edgeGlow = Number( value );
    } );
    folder.add( params, 'edgeThickness', 1, 4 ).onChange( function ( value ) {
        redTeamOutline.edgeThickness = Number( value );
        blueTeamOutline.edgeThickness = Number( value );
        stageOutline.edgeThickness = Number( value );
    } );
    folder.addColor( params, 'visibleEdgeColor' ).onChange( function ( value ) {
        redTeamOutline.visibleEdgeColor.set( value );
        blueTeamOutline.visibleEdgeColor.set( value );
        stageOutline.visibleEdgeColor.set( value );
    } );
    folder.addColor( params, 'hiddenEdgeColor' ).onChange( function ( value ) {
        redTeamOutline.hiddenEdgeColor.set( value );
        blueTeamOutline.hiddenEdgeColor.set( value );
        stageOutline.hiddenEdgeColor.set( value );
    } );
}

function onWindowResize() {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( container.clientWidth, container.clientHeight );
    composer.setSize( container.clientWidth, container.clientHeight );

    // Update resolution for pixelation effect
    pixelPass.uniforms[ "resolution" ].value.set( container.clientWidth, container.clientHeight ).multiplyScalar( window.devicePixelRatio );
}

function animate() {
    requestAnimationFrame( animate );

    stats.begin();
    if (moveLeft) {
        tanModel.translateY( -8 );
    }
    if (moveRight) {
        tanModel.translateY( 8 );
    }
    render();
    stats.end();
}

function render() {
    camera.lookAt( scene.position );

    if ( params.postprocessing ) {
        composer.render();
    } else {
        renderer.render( scene, camera );
    }
}

document.getElementById("left").ontouchstart = function() {
    moveLeft = true;
}
document.getElementById("left").ontouchend = function() {
    moveLeft = false;
}
document.getElementById("left").ontouchmove = function() {
}

document.getElementById("right").ontouchstart = function() {
    moveRight = true;
}
document.getElementById("right").ontouchend = function() {
    moveRight = false;
}
document.getElementById("right").ontouchmove = function() {
}

// TODO: Call these on load of models?
init();
animate();