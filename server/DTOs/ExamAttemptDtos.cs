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
