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
		"uniform vec2 resolution;",
		"uniform float pixelSize;",

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

		/*
		 * hue: Color in the range of [0,1]
		 * shiftDistance: how many steps to shift hue towards blue or yellow {-2, -1, 0, 1, 2}
		 */
		"float calculateHueShift(float hue, int shiftDistance)",
		"{",
			// The maximum amount to shift by
		"	float shiftConstant = 18.0;",
			// Convert from [0,1] to color wheel [0,360]
		"	float shiftedHue = hue * 360.0;",
			// Red to Yellow on the color wheel (includes orange)
		"	if (shiftedHue < 60.0) {",
		      // Darken by shifting to blue
		"	  if (shiftDistance < 0) {",
		"	    shiftedHue += ((180.0 - shiftedHue) / 180.0 ) * shiftConstant * float(shiftDistance);",
		"	  }",
			  // Brighten by shifting to yellow
		"	  else if (shiftDistance > 0) {",
		 		// Don't shift yellow (shiftedHue = 60), maximum distance is 180 degrees from yellow
		"	    shiftedHue += ((60.0 - shiftedHue) / 180.0 ) * shiftConstant * float(shiftDistance);",
		"	  }",
			  // Change back to [0,360] degrees
		"	  shiftedHue = mod(shiftedHue, 360.0);",
		"	}",
			// Blue to red on the color wheel (includes purple)
		"	else if (shiftedHue > 240.0) {",
			  // Darken by shifting to blue
  		"	  if (shiftDistance < 0) {",
			    // Don't shift blue (shiftedHue = 240), maximum distance is 180 degrees from blue
		"	    shiftedHue += ((shiftedHue - 240.0) / 180.0 ) * shiftConstant * float(shiftDistance);",
		"	  }",
			  // Brighten by shifting to yellow
		"	  else if (shiftDistance > 0) {",
		"	    shiftedHue += ((420.0 - shiftedHue) / 180.0 ) * shiftConstant * float(shiftDistance);",
		"	  }",
			  // Change back to [0,360] degrees
		"	  shiftedHue = mod(shiftedHue, 360.0);",
		"	}",
			// Yellow to blue on the color wheel (includes green)
		"	else if (shiftedHue > 60.0 || shiftedHue < 240.0) {",
			  // Darken by shifting to blue
		"	  if (shiftDistance < 0) {",
				// Don't shift blue (shiftedHue = 240), maximum distance is 180 degrees from blue
		"	    shiftedHue -= ((240.0 - shiftedHue) / 180.0 ) * shiftConstant * float(shiftDistance);",
		"	  }",
			  // Brighten by shifting to yellow
		"	  else if (shiftDistance > 0) {",
				// Don't shift yellow (shiftedHue = 60), maximum distance is 180 degrees from yellow
		"	    shiftedHue -= ((shiftedHue - 60.0) / 180.0 ) * shiftConstant * float(shiftDistance);",
		"	  }",
			  // Change back to [0,360] degrees
		"	  shiftedHue = mod(shiftedHue, 360.0);",
		"	}",
			// Convert from color wheel [0,360] to [0,1]
		"	return (shiftedHue / 360.0);",
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
		"float hue[7];",
		"hue[0] = 0.0/360.0;",
		"hue[1] = 20.0/360.0;",
		"hue[2] = 40.0/360.0;",
		"hue[3] = 50.0/360.0;",
		"hue[4] = 110.0/360.0;",
		"hue[5] = 210.0/360.0;",
		"hue[6] = 275.0/360.0;",
		// Find the hue in the key that is closest to the rendered pixel
		"float minDistance = abs(hsvColor.x - hue[0]);",
		"float currentDistance;",
		"float closestColor = hue[0];",
		"for(int i = 1; i < 7; i++) {",
		"  currentDistance = abs(hsvColor.x - hue[i]);",
		"  if(currentDistance <= minDistance) {",
		"    minDistance = currentDistance;",
		"    closestColor = hue[i];",
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
		"float closestBrightness = brightness[0];",
		"int hueShift;",
		"float saturationShift;",
		"for(int i = 0; i < 5; i++) {",
		"  currentDistance = abs(compressedBrightness - brightness[i]);",
		"  if(currentDistance <= minDistance) {",
		"    minDistance = currentDistance;",
		"    closestBrightness = brightness[i];",
		//   Shift the hue by 7 degreess (-14, -7, 0, +7, +14) towards blue if it's darker or yellow if it's lighter
		"    hueShift = i - 2;",
		//   Shift the hue by 5 percent (-0.1, -0.05, 0, -0.05, -0.1) towards grey if brighter or darker
		"    saturationShift = -abs(float(i-2)) * 0.05;",
		"  }",
		"}",
		// If saturation is low then color is black, grey, white, or skin and hair colors
		"if (hsvColor.y < 0.4)",
		"  gl_FragColor = vec4(hsv2rgb(vec3(hsvColor.x, hsvColor.y, hsvColor.z)), 1.0);",
		"else {",
		// Hue should be one of the colors from the color key, saturation should be constant, and brightness should be from the brightness key
		"  gl_FragColor = vec4(hsv2rgb(vec3(calculateHueShift(closestColor, hueShift), 0.7 + saturationShift, closestBrightness)), 1.0);",
		"}",
		"}"

	].join( "\n" )
};

export { PixelShader };
