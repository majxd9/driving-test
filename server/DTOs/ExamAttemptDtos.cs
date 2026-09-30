namespace DrivingTestApi.DTOs;

public record SubmitExamAttemptRequest(
    int ModelId,
    Dictionary<int, int> Answers);

public record ExamAttemptResponse(
    int Id,
    int ModelId,
    int Correct,
    int Total,
    int Answered,
    List<int> WrongQuestionIds,
    DateTime CreatedAt);

public record ExamReviewQuestionResponse(
    int Id,
    string Text,
    List<string> Options,
    int CorrectAnswerIndex,
    int? ChosenAnswerIndex,
    string? Explanation,
    string? ImageUrl,
    string? DiagramType,
    string? DiagramUrl,
    string? DiagramTitle,
    string? DiagramDescription);

public record ExamSubmissionResponse(
    int Id,
    int ModelId,
    int Correct,
    int Total,
    int Answered,
    List<int> WrongQuestionIds,
    DateTime CreatedAt,
    List<ExamReviewQuestionResponse> ReviewQuestions);

public record ExamQuestionResponse(
    int Id,
    string Text,
    List<string> Options,
    int CorrectAnswerIndex,
    string? Explanation,
    string? ImageUrl,
    string? DiagramType,
    string? DiagramUrl,
    string? DiagramTitle,
    string? DiagramDescription,
    string? AudioUrl);
