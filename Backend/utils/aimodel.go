package utils

import (
	"bytes"
	"encoding/json"
	"errors"
	"net/http"
	"time"
)

type SimilarityResponse struct {
	SimilarProjects []map[string]interface{} `json:"similar_projects"`
	TotalProjects   int                      `json:"total_similar_projects"`
}

func CheckProjectSimilarity(name, description string) (*SimilarityResponse, error) {
	// pythonServiceURL := "https://python-simialrity.fly.dev/detect_similarities"
	pythonServiceURL := "http://localhost:5000/detect_similarities"

	requestBody, err := json.Marshal(map[string]interface{}{
		"project_name":         name,
		"project_description":  description,
		"similarity_threshold": 50,
	})

	if err != nil {
		return nil, err
	}

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Post(
		pythonServiceURL,
		"application/json",
		bytes.NewBuffer(requestBody),
	)
	if err != nil {
		return nil, errors.New("server is offline or unreachable")
	}
	defer resp.Body.Close()

	// Handle different response status codes
	if resp.StatusCode == http.StatusOK {
		var similarityResp SimilarityResponse
		err = json.NewDecoder(resp.Body).Decode(&similarityResp)
		if err != nil {
			return nil, err
		}
		return &similarityResp, nil
	} else if resp.StatusCode == http.StatusConflict {
		var similarityResp SimilarityResponse
		err = json.NewDecoder(resp.Body).Decode(&similarityResp)
		if err != nil {
			return nil, err
		}
		return &similarityResp, nil
	} else {
		return nil, errors.New("failed to fetch similarity results from API")
	}
}
