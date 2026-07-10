/**
 * EnvironmentHandlers — Execute pre-rendered Luau templates from environment tools.
 *
 * Unlike executeLuau (which runs arbitrary code), this endpoint is designed for
 * server-rendered templates with opId markers for output capture and tagging.
 */

function executeTemplate(requestData: Record<string, unknown>) {
	const luauSource = requestData.luauSource as string;
	const opId = requestData.opId as string;

	if (!luauSource || luauSource === "") return { ok: false, error: "luauSource is required" };
	if (!opId || opId === "") return { ok: false, error: "opId is required" };

	const output: string[] = [];
	const oldPrint = print;
	const oldWarn = warn;

	// Capture output scoped to this operation via ENVTOOLS markers
	const env = getfenv(0) as unknown as Record<string, unknown>;
	env["print"] = (...args: defined[]) => {
		const parts: string[] = [];
		for (const a of args) parts.push(tostring(a));
		const line = parts.join("\t");
		output.push(line);
		oldPrint(...(args as [defined, ...defined[]]));
	};
	env["warn"] = (...args: defined[]) => {
		const parts: string[] = [];
		for (const a of args) parts.push(tostring(a));
		const line = `[warn] ${parts.join("\t")}`;
		output.push(line);
		oldWarn(...(args as [defined, ...defined[]]));
	};

	const [success, result] = pcall(() => {
		const [fn, compileError] = loadstring(luauSource);
		if (!fn) error(`Compile error: ${compileError}`);
		return fn();
	});

	env["print"] = oldPrint;
	env["warn"] = oldWarn;

	if (success) {
		// Template returns {ok, error?} table
		const returnTable = result as { ok?: boolean; error?: string } | undefined;
		return {
			ok: returnTable?.ok ?? true,
			error: returnTable?.error,
			output,
			opId,
		};
	} else {
		return {
			ok: false,
			error: tostring(result),
			output,
			opId,
		};
	}
}

export = {
	executeTemplate,
};
