using DrivingTestApi.Models;

namespace DrivingTestApi.DTOs;

public record QuestionUpsertRequest(
    QuestionCategory Category,
    string Text,
    List<string> Options,
    int CorrectAnswerIndex,
    string? Explanation,
    string? ImageUrl,
    string? DiagramType,
    string? DiagramUrl,
    string? DiagramTitle,
    string? DiagramDescription);

public record ExamResultRequest(int ModelId, int Total, int Correct, int Answered);
