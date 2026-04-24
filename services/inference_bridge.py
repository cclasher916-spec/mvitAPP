import os
import sys
import ast
import json
import torch
from supabase import create_client, Client
from model_utils import FRUKnowledgeTracing

# --- Configuration ---
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set as GitHub Secrets.")
    sys.exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Dimensionality for ReKT features
FEATURE_DIM = 64

# --- AST Structural Embedding ---
def get_ast_complexity(code_str: str) -> float:
    """
    Extracts structural complexity from Python code using AST parsing.
    """
    if not code_str:
        return 0.0
    try:
        tree = ast.parse(code_str)
        nodes = list(ast.walk(tree))
        complexity = len(nodes) / 10.0
        return min(complexity, 10.0)
    except Exception:
        return 0.0

# --- Inference Orchestrator ---
def process_batch(batch_data):
    """
    Processes a batch of interactions triggered by Supabase pg_net.
    """
    model = FRUKnowledgeTracing(feature_dim=FEATURE_DIM)

    for record in batch_data:
        student_id = record.get('student_id')
        problem_id = record.get('problem_id', 'unknown')
        is_correct = record.get('is_correct', False)

        if not student_id:
            print(f"Skipping record with no student_id: {record}")
            continue

        print(f"  → Processing student={student_id}, problem={problem_id}, correct={is_correct}")

        # 1. Fetch current cognitive state (safe None check)
        try:
            state_resp = supabase.table("knowledge_states") \
                .select("*") \
                .eq("student_id", student_id) \
                .maybe_single() \
                .execute()
            existing_state = state_resp.data if state_resp else None
        except Exception as e:
            print(f"  ⚠ Could not fetch knowledge state: {e}")
            existing_state = None

        if existing_state and existing_state.get('current_hidden_state'):
            try:
                prev_hidden = torch.tensor(
                    json.loads(existing_state['current_hidden_state']),
                    dtype=torch.float32
                )
            except Exception:
                prev_hidden = torch.zeros(FEATURE_DIM)
        else:
            # Cold-start: no prior state
            prev_hidden = torch.zeros(FEATURE_DIM)

        # 2. Use pre-calculated AST complexity from dispatcher
        complexity = float(record.get('ast_structural_complexity') or 0.5)

        # 3. Build ReKT input tensors
        q_embed      = torch.randn(FEATURE_DIM)
        c_embed      = torch.randn(FEATURE_DIM)
        diff_scalar  = torch.tensor([complexity])
        v_embed      = torch.randn(FEATURE_DIM)
        time_interval = torch.tensor([1.0])

        # 4. Run ReKT Forward Pass
        with torch.no_grad():
            prob, new_hidden = model(
                q_embed, c_embed, diff_scalar, v_embed,
                prev_hidden, time_interval
            )

        mastery_score = float(prob.item())
        print(f"  ✓ Predicted mastery score: {mastery_score:.4f}")

        # 5. Write new knowledge state back to Supabase
        try:
            supabase.table("knowledge_states").upsert({
                "student_id": student_id,
                "current_hidden_state": json.dumps(new_hidden.tolist()),
                "concept_mastery_scores": json.dumps({"general": mastery_score}),
                "frustration_index": max(0.0, 1.0 - mastery_score) if not is_correct else 0.1,
                "last_updated": "now()"
            }).execute()
            print(f"  ✓ Knowledge state upserted for {student_id}")
        except Exception as e:
            print(f"  ✗ Failed to write knowledge state: {e}")

        # 6. Generate a learning path recommendation if mastery is low
        if mastery_score < 0.5:
            try:
                supabase.table("learning_paths").insert({
                    "student_id": student_id,
                    "recommended_problem_id": f"practice-{problem_id}-followup",
                    "predicted_success_probability": mastery_score + 0.2,
                    "justification_text": (
                        f"Your model predicts {mastery_score*100:.0f}% mastery on this concept. "
                        "Practice a simpler variant to consolidate understanding."
                    ),
                    "is_completed": False
                }).execute()
                print(f"  ✓ Learning path recommendation created")
            except Exception as e:
                print(f"  ⚠ Learning path insert failed: {e}")

if __name__ == "__main__":
    path = os.getenv("GITHUB_EVENT_PATH")
    if not path or not os.path.exists(path):
        print("ERROR: GITHUB_EVENT_PATH not found.")
        sys.exit(1)

    with open(path, "r") as f:
        event_data = json.load(f)

    batch = event_data.get("client_payload", {}).get("batch_data", [])

    if not batch:
        print("No batch data found in event payload. Exiting cleanly.")
        sys.exit(0)

    print(f"Processing batch of {len(batch)} interactions...")
    process_batch(batch)
    print("✅ Batch inference complete.")
