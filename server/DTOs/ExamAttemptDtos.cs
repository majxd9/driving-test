namespace DrivingTestApi.DTOs;

public record StartExamRequest(int ModelId);
public record SaveExamAnswerRequest(int QuestionId, int SelectedAnswerIndex);
public record SubmitExamAttemptRequest(Dictionary<int, int>? Answers = null);

public record ExamAttemptResponse(
    int Id, int ModelId, int Correct, int Total, int Answered,
    List<int> WrongQuestionIds, DateTime CreatedAt);

public record ExamReviewQuestionResponse(
    int Id, string Text, List<string> Options, int CorrectAnswerIndex,
    int? ChosenAnswerIndex, string? Explanation, string? ImageUrl,
    string? DiagramType, string? DiagramUrl, string? DiagramTitle,
    string? DiagramDescription, string? AiImageUrl);

public record ExamSubmissionResponse(
    int Id, int ModelId, int Correct, int Total, int Answered,
    List<int> WrongQuestionIds, DateTime CreatedAt,
    List<ExamReviewQuestionResponse> ReviewQuestions);

public record ExamSessionQuestionResponse(
    int Id, string Text, List<string> Options, string? ImageUrl,
    string? DiagramType, string? DiagramUrl, string? DiagramTitle,
    string? DiagramDescription, string? AudioUrl, string? AiImageUrl);

public record ExamSessionResponse(
    int AttemptId, int ModelId, DateTime ExpiresAt,
    Dictionary<int, int> Answers, List<ExamSessionQuestionResponse> Questions);

public record ExamQuestionResponse(
    int Id, string Text, List<string> Options, int CorrectAnswerIndex,
    string? Explanation, string? ImageUrl, string? DiagramType,
    string? DiagramUrl, string? DiagramTitle, string? DiagramDescription,
    string? AudioUrl, string? AiImageUrl);
