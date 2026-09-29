export const FULLSCREEN_VERT = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`;

export type FullscreenPass = {
	gl: WebGL2RenderingContext;
	program: WebGLProgram;
	uniform: (name: string) => WebGLUniformLocation | null;
	draw: () => void;
	dispose: () => void;
};

function compile(gl: WebGL2RenderingContext, type: number, src: string, label: string) {
	const shader = gl.createShader(type);
	if (!shader) return null;
	gl.shaderSource(shader, src);
	gl.compileShader(shader);
	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		console.warn(`[${label}]`, gl.getShaderInfoLog(shader));
		gl.deleteShader(shader);
		return null;
	}
	return shader;
}

/** Compiles a fragment shader over a single full-screen triangle. Returns null when WebGL2 is unavailable. */
export function createFullscreenPass(
	canvas: HTMLCanvasElement,
	frag: string,
	label: string,
	options: WebGLContextAttributes = {}
): FullscreenPass | null {
	const gl = canvas.getContext('webgl2', {
		alpha: false,
		antialias: false,
		depth: false,
		stencil: false,
		powerPreference: 'low-power',
		preserveDrawingBuffer: false,
		...options
	});
	if (!gl) return null;

	const vs = compile(gl, gl.VERTEX_SHADER, FULLSCREEN_VERT, label);
	const fs = compile(gl, gl.FRAGMENT_SHADER, frag, label);
	const program = gl.createProgram();
	if (!vs || !fs || !program) return null;
	gl.attachShader(program, vs);
	gl.attachShader(program, fs);
	gl.linkProgram(program);
	if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
		console.warn(`[${label}]`, gl.getProgramInfoLog(program));
		return null;
	}
	gl.useProgram(program);

	const buffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
	const aPos = gl.getAttribLocation(program, 'aPos');
	gl.enableVertexAttribArray(aPos);
	gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

	const cache = new Map<string, WebGLUniformLocation | null>();

	return {
		gl,
		program,
		uniform(name) {
			if (!cache.has(name)) cache.set(name, gl.getUniformLocation(program, name));
			return cache.get(name) ?? null;
		},
		draw() {
			gl.drawArrays(gl.TRIANGLES, 0, 3);
		},
		dispose() {
			gl.deleteBuffer(buffer);
			gl.deleteProgram(program);
			gl.deleteShader(vs);
			gl.deleteShader(fs);
		}
	};
}
