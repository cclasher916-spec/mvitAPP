import torch
import torch.nn as nn

class FRUKnowledgeTracing(nn.Module):
    """
    Revisiting Knowledge Tracing (ReKT) model core using the 
    Forget-Response-Update (FRU) framework.
    
    Optimized for zero-budget environments by providing high predictive
    accuracy with only 38% of the computational overhead of LSTMs.
    """
    def __init__(self, feature_dim):
        super(FRUKnowledgeTracing, self).__init__()
        self.feature_dim = feature_dim
        
        # The FRU framework is composed of just two linear regression units
        # 1. Update Unit: Handles the "Forget" and "Update" mechanics
        # Inputs: [Current Feature, Previous Hidden State, Time Interval]
        self.update_unit = nn.Linear(feature_dim * 2 + 1, feature_dim)
        
        # 2. Response Unit: Predicts the student's success probability 
        # Inputs: [Newly Updated Hidden State, Current Feature]
        self.response_unit = nn.Linear(feature_dim * 2, 1)

    def forward(self, q_embed, c_embed, diff_scalar, v_embed, prev_hidden_state, time_interval):
        """
        Args:
            q_embed: Question structural embedding (from AST parsing)
            c_embed: Concept/Domain embedding (e.g., 'Recursion')
            diff_scalar: Extracted difficulty scalar
            v_embed: Difficulty variation embedding
            prev_hidden_state: Serialized trajectory from Supabase JSONB
            time_interval: Elapsed time since last interaction (for memory decay)
        """
        # Step 1: Construct feature representation based on ReKT principles
        # Formula: E = Q + C + (diff * V)
        current_feature = q_embed + c_embed + (diff_scalar * v_embed)
        
        # Step 2: The "Forget" and "Update" Phase
        # Concatenate inputs for the first linear unit
        update_input = torch.cat([current_feature, prev_hidden_state, time_interval], dim=-1)
        
        # Calculate the new cognitive hidden state
        new_hidden_state = torch.sigmoid(self.update_unit(update_input))
        
        # Step 3: The "Response" Phase
        # Combine updated state with current feature to predict success
        response_input = torch.cat([new_hidden_state, current_feature], dim=-1)
        
        # Calculate probability of success on subsequent question
        prediction_prob = torch.sigmoid(self.response_unit(response_input))
        
        return prediction_prob, new_hidden_state
