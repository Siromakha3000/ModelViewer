namespace ModelViewer.Models;

public class Mesh
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string ModelFileURL { get; set; } = string.Empty;
    public string Tags { get; set; } = string.Empty; // Comma-separated tags
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
