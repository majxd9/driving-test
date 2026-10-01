using System.Net.Http.Json;
using System.Text.Json;
using DrivingTestApi.Models;

namespace DrivingTestApi.Services;

public sealed class ElevenLabsQuestionAudioGenerator : IQuestionAudioGenerator
{
    private const string VoiceId="mbMMm5Ft0vNUPsMKAZFu";
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;

    public ElevenLabsQuestionAudioGenerator(IHttpClientFactory httpClientFactory,IConfiguration configuration)
    { _httpClientFactory=httpClientFactory;_configuration=configuration; }

    public async Task<GeneratedAudioResult> GenerateAsync(Question question,CancellationToken cancellationToken)
    {
        var apiKey=_configuration["ELEVENLABS_API_KEY"];
        if(string.IsNullOrWhiteSpace(apiKey)) throw new InvalidOperationException("لم يتم ضبط ELEVENLABS_API_KEY على الخادم.");
        var client=_httpClientFactory.CreateClient("ElevenLabs");
        using var request=new HttpRequestMessage(HttpMethod.Post,$"v1/text-to-speech/{VoiceId}?output_format=mp3_44100_128");
        request.Headers.TryAddWithoutValidation("xi-api-key",apiKey);
        request.Content=JsonContent.Create(new{text=QuestionAudioTextBuilder.Build(question),model_id="eleven_multilingual_v2",
            voice_settings=new{stability=0.55,similarity_boost=0.8,style=0.1,use_speaker_boost=true}});
        using var response=await client.SendAsync(request,HttpCompletionOption.ResponseHeadersRead,cancellationToken);
        if(!response.IsSuccessStatusCode)
        {
            var error=await response.Content.ReadAsStringAsync(cancellationToken);
            var status=string.Empty;var message=string.Empty;
            try
            {
                using var document=JsonDocument.Parse(error);var root=document.RootElement;
                if(root.TryGetProperty("detail",out var detail))
                {
                    if(detail.ValueKind==JsonValueKind.Object)
                    {status=detail.TryGetProperty("status",out var s)?s.GetString()??string.Empty:string.Empty;
                     message=detail.TryGetProperty("message",out var m)?m.GetString()??string.Empty:string.Empty;}
                    else message=detail.GetString()??string.Empty;
                }
                if(string.IsNullOrWhiteSpace(status)&&root.TryGetProperty("status",out var top))status=top.GetString()??string.Empty;
                if(string.IsNullOrWhiteSpace(message)&&root.TryGetProperty("message",out var topm))message=topm.GetString()??string.Empty;
            }catch(JsonException){}
            throw new HttpRequestException(string.IsNullOrWhiteSpace(message)?$"تعذر توليد الصوت من ElevenLabs للسؤال {question.Id}.":$"ElevenLabs: {status} — {message}");
        }
        var bytes=await response.Content.ReadAsByteArrayAsync(cancellationToken);
        if(bytes.Length==0)throw new InvalidOperationException("تمت استجابة ElevenLabs بدون ملف صوتي.");
        return new GeneratedAudioResult(bytes);
    }
}