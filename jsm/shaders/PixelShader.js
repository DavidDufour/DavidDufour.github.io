/**
 * @author wongbryan / http://wongbryan.github.io
 *
 * Pixelation shader
 */



var PixelShader = {

	uniforms: {

		"tDiffuse": { value: null },
		"resolution": { value: null },
		"pixelSize": { value: 1. },

	},

	vertexShader: [

		"varying highp vec2 vUv;",

		"void main() {",

		"vUv = uv;",
		"gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",

		"}"

	].join( "\n" ),

	fragmentShader: [

		"uniform sampler2D tDiffuse;",
		"uniform float pixelSize;",
		"uniform vec2 resolution;",

		"varying highp vec2 vUv;",

		"vec3 rgb2hsv(vec3 c)",
		"{",
		"	vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);",
		"	vec4 p = c.g < c.b ? vec4(c.bg, K.wz) : vec4(c.gb, K.xy);",
		"	vec4 q = c.r < p.x ? vec4(p.xyw, c.r) : vec4(c.r, p.yzx);",
		
		"	float d = q.x - min(q.w, q.y);",
		"   float e = 1.0e-10;",
		"	return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);",
		"}",

		"vec3 hsv2rgb(vec3 c)",
		"{",
		"	vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);",
		"	vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);",
		"	return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);",
		"}",

		"void main() {",

		"vec2 dxy = pixelSize / resolution;",
		// Get the pixel located in a range that represents the output pixel
		"vec2 coord = dxy * floor( vUv / dxy );",
		// Get the colour from the pixel at coord
		"vec4 pixelColor = texture2D(tDiffuse, coord);",
		// Convert RGB to HSV
		"vec3 hsvColor = rgb2hsv(vec3(pixelColor.r, pixelColor.g, pixelColor.b));",
		// Color key of limited output color set
		"float color[8];",
		"color[0] = 0.0;",
		"color[1] = 20.0/360.0;",
		"color[2] = 30.0/360.0;",
		"color[3] = 40.0/360.0;",
		"color[4] = 50.0/360.0;",
		"color[5] = 110.0/360.0;",
		"color[6] = 210.0/360.0;",
		"color[7] = 275.0/360.0;",
		// Find the color in the key that is closest to the rendered pixel
		"float minDistance = abs(hsvColor.x - color[0]);",
		"float currentDistance;",
		"float closestColor = color[0];",
		"for(int i = 1; i < 8; i++) {",
		"  currentDistance = abs(hsvColor.x - color[i]);",
		"  if(currentDistance <= minDistance) {",
		"    minDistance = currentDistance;",
		"    closestColor = color[i];",
		"  }",
		"}",
		// Brightness key for limited values brightness can be
		// TODO: Change this to 4 colors to match the four tones of the material
		"float brightness[5];",
		"brightness[0] = 0.4;",
		"brightness[1] = 0.5;",
		"brightness[2] = 0.6;",
		"brightness[3] = 0.7;",
		"brightness[4] = 0.8;",
		// Compress the brightness to between 40% and 80%
		"float compressedBrightness = 0.4 * hsvColor.z + 0.4;",
		"minDistance = abs(compressedBrightness - brightness[0]);",
		"float closestBrightness = color[0];",
		"float hueShift;",
		"float saturationShift;",
		"for(int i = 0; i < 5; i++) {",
		"  currentDistance = abs(compressedBrightness - brightness[i]);",
		"  if(currentDistance <= minDistance) {",
		"    minDistance = currentDistance;",
		"    closestBrightness = brightness[i];",
		//   Shift the hue by 7 degreess (-14, -7, 0, +7, +14) towards blue if it's darker or yellow if it's lighter
		"    hueShift = float(i-2) * (7.0/360.0);",
		//   Shift the hue by 5 percent (-0.1, -0.05, 0, -0.05, -0.1) towards grey if brighter or darker
		"    saturationShift = -abs(float(i-2)) * 0.05;",
		"  }",
		"}",
		// If saturation is low then color is black, grey, white, or skin and hair colors
		"if (hsvColor.y < 0.4)",
		"  gl_FragColor = vec4(hsv2rgb(vec3(hsvColor.x + hueShift, hsvColor.y, hsvColor.z)), 1.0);",
		"else {",
		// Hue should be one of the colors from the color key, saturation should be constant, and brightness should be from the brightness key
		// TODO: Switch back to this: "  gl_FragColor = vec4(hsv2rgb(vec3(closestColor + hueShift, 0.7 + saturationShift, closestBrightness)), 1.0);",
		"  gl_FragColor = vec4(hsv2rgb(vec3(closestColor + hueShift, 0.7 + saturationShift, closestBrightness)), 1.0);",
		"}",
		"}"

	].join( "\n" )
};

export { PixelShader };
