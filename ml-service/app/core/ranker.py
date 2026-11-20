"""
ReviewerRanker — TF-IDF + Cosine Similarity reviewer expertise ranking.

Algorithm:
1. Each reviewer has a commitHistory: [{files: [path, ...], message: str}]
2. Build a "reviewer document" by joining all committed file paths into text
   (e.g. "src/auth/login.js src/middleware/auth.js" → "src auth login js src middleware auth js")
3. Build a "query document" from the PR's changed file paths
4. TF-IDF vectorize the corpus (query + all reviewer documents)
5. Cosine similarity between PR query and each reviewer's document
6. Apply workload penalty: final_score = similarity × (1 / (1 + open_reviews))
7. Return top N reviewer IDs sorted by final_score
"""
import logging
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

logger = logging.getLogger("ranker")


class ReviewerRanker:
    def __init__(self, top_n: int = 2):
        self.top_n = top_n

    # ── Text helpers ──────────────────────────────────────────────────────────

    def _paths_to_text(self, paths: list[str]) -> str:
        """
        Converts file paths into a bag-of-words string.
        'src/auth/login.js' → 'src auth login js'
        TF-IDF then treats path segments as tokens, so 'auth' appears
        frequently for auth-heavy reviewers and matches auth-related PRs.
        """
        tokens = []
        for path in paths:
            # Split on path separators and file extensions
            for part in path.replace("/", " ").replace("\\", " ").replace(".", " ").split():
                if part.strip():
                    tokens.append(part.lower())
        return " ".join(tokens)

    def _build_reviewer_text(self, reviewer: dict) -> str:
        """Build the expertise corpus for one reviewer from their commit history."""
        all_paths = []
        for commit in reviewer.get("commitHistory", []):
            all_paths.extend(commit.get("files", []))
        # Also include expertiseTags if present (manually set keywords)
        tags = reviewer.get("expertiseTags", [])
        tag_text = " ".join(tags)
        return self._paths_to_text(all_paths) + " " + tag_text

    # ── Ranking ───────────────────────────────────────────────────────────────

    def rank(
        self,
        changed_paths: list[str],
        reviewers: list[dict],
        stage_type: str,
    ) -> list[dict]:
        """
        Ranks reviewers for a given PR.

        Args:
            changed_paths: file paths changed in the PR
            reviewers: list of user dicts (with _id, commitHistory, currentOpenReviews)
            stage_type: e.g. 'AUTH_REVIEW' — used for logging

        Returns:
            list of dicts [{reviewer_id, score}] sorted best-first, capped at top_n
        """
        if not reviewers:
            logger.warning(f"No reviewers available for stage {stage_type}")
            return []

        query_text = self._paths_to_text(changed_paths)
        reviewer_texts = [(r, self._build_reviewer_text(r)) for r in reviewers]

        # Split into those with history and those without
        with_history    = [(r, t) for r, t in reviewer_texts if t.strip()]
        without_history = [r for r, t in reviewer_texts if not t.strip()]

        ranked_results = []

        # ── TF-IDF similarity for reviewers with history ──────────────────────
        if with_history:
            valid_reviewers, valid_texts = zip(*with_history)
            corpus = [query_text] + list(valid_texts)

            try:
                vectorizer = TfidfVectorizer(
                    ngram_range=(1, 2),
                    min_df=1,
                    sublinear_tf=True,   # log(1+tf) — reduces impact of high-freq terms
                    analyzer="word",
                )
                tfidf_matrix = vectorizer.fit_transform(corpus)
                query_vec     = tfidf_matrix[0:1]
                reviewer_vecs = tfidf_matrix[1:]
                similarities  = cosine_similarity(query_vec, reviewer_vecs)[0]

                for reviewer, sim in zip(valid_reviewers, similarities):
                    open_reviews   = max(0, int(reviewer.get("currentOpenReviews", 0) or 0))
                    workload_penalty = 1.0 / (1.0 + open_reviews)
                    final_score    = float(sim) * workload_penalty
                    ranked_results.append({
                        "reviewer_id": str(reviewer["_id"]),
                        "score": round(final_score, 4),
                    })

            except ValueError as e:
                logger.warning(f"TF-IDF failed ({e}) — falling back to workload sort")
                for reviewer in valid_reviewers:
                    open_reviews = max(0, int(reviewer.get("currentOpenReviews", 0) or 0))
                    ranked_results.append({
                        "reviewer_id": str(reviewer["_id"]),
                        "score": round(1.0 / (1.0 + open_reviews), 4),
                    })

        # ── Fallback for reviewers with no history: rank by workload only ─────
        for reviewer in without_history:
            open_reviews = max(0, int(reviewer.get("currentOpenReviews", 0) or 0))
            ranked_results.append({
                "reviewer_id": str(reviewer["_id"]),
                "score": round(0.01 / (1.0 + open_reviews), 4),  # Very low but non-zero
            })

        # Sort descending by score
        ranked_results.sort(key=lambda x: x["score"], reverse=True)

        logger.info(
            f"Ranked {len(ranked_results)} reviewers for {stage_type}",
            extra={"top": ranked_results[:self.top_n]},
        )

        return ranked_results[:self.top_n]
