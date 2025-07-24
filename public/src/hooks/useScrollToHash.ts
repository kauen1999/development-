// src/hooks/useScrollToHash.ts
import { useEffect } from "react";

export function useScrollToHash() {
	useEffect(() => {
	const hash = window.location.hash;
	if (hash) {
		const element = document.querySelector(hash);
		if (element) {
			element.scrollIntoView({ behavior: "smooth" });
		}
	}
	}, []);
}
