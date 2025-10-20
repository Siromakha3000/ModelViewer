using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ModelViewer.Data;
using ModelViewer.Models;

namespace ModelViewer.Controllers;

[ApiController]
[Route("api/[controller]")]
public class MeshesController : ControllerBase
{
    private readonly ModelViewerContext _context;
    private readonly IWebHostEnvironment _env;
    private readonly ILogger<MeshesController> _logger;

    public MeshesController(ModelViewerContext context, IWebHostEnvironment env, ILogger<MeshesController> logger)
    {
        _context = context;
        _env = env;
        _logger = logger;
    }

    /// <summary>
    /// Get all meshes or search by tags
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Mesh>>> GetMeshes([FromQuery] string? tags = null)
    {
        var query = _context.Meshes.AsQueryable();

        if (!string.IsNullOrWhiteSpace(tags))
        {
            var tagList = tags.Split(',').Select(t => t.Trim().ToLower()).ToList();
            query = query.Where(m => tagList.Any(tag => m.Tags.ToLower().Contains(tag)));
        }

        return await query.OrderByDescending(m => m.CreatedAt).ToListAsync();
    }

    /// <summary>
    /// Get a specific mesh by ID
    /// </summary>
    [HttpGet("{id}")]
    public async Task<ActionResult<Mesh>> GetMesh(int id)
    {
        var mesh = await _context.Meshes.FindAsync(id);

        if (mesh == null)
        {
            return NotFound(new { message = "Mesh not found" });
        }

        return mesh;
    }

    /// <summary>
    /// Create a new mesh with file upload
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<Mesh>> CreateMesh([FromForm] string title, [FromForm] string tags, [FromForm] IFormFile file)
    {
        if (string.IsNullOrWhiteSpace(title))
        {
            return BadRequest(new { message = "Title is required" });
        }

        if (file == null || file.Length == 0)
        {
            return BadRequest(new { message = "3D model file is required" });
        }

        try
        {
            // Validate file extension (support common 3D formats)
            var allowedExtensions = new[] { ".glb", ".gltf", ".obj", ".fbx", ".stl", ".ply" };
            var fileExtension = Path.GetExtension(file.FileName).ToLower();

            if (!allowedExtensions.Contains(fileExtension))
            {
                return BadRequest(new { message = $"File type '{fileExtension}' is not supported. Allowed types: {string.Join(", ", allowedExtensions)}" });
            }

            // Create uploads directory if it doesn't exist
            var uploadsPath = Path.Combine(_env.WebRootPath, "uploads");
            if (!Directory.Exists(uploadsPath))
            {
                Directory.CreateDirectory(uploadsPath);
            }

            // Generate unique filename
            var fileName = $"{Guid.NewGuid()}{fileExtension}";
            var filePath = Path.Combine(uploadsPath, fileName);

            // Save file
            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            // Create mesh entity
            var mesh = new Mesh
            {
                Title = title.Trim(),
                ModelFileURL = $"/uploads/{fileName}",
                Tags = tags?.Trim() ?? string.Empty,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Meshes.Add(mesh);
            await _context.SaveChangesAsync();

            _logger.LogInformation($"Mesh created with ID: {mesh.Id}, File: {fileName}");

            return CreatedAtAction(nameof(GetMesh), new { id = mesh.Id }, mesh);
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error creating mesh: {ex.Message}");
            return StatusCode(500, new { message = "An error occurred while uploading the file" });
        }
    }

    /// <summary>
    /// Update an existing mesh
    /// </summary>
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateMesh(int id, [FromBody] UpdateMeshDto updateDto)
    {
        var mesh = await _context.Meshes.FindAsync(id);

        if (mesh == null)
        {
            return NotFound(new { message = "Mesh not found" });
        }

        if (!string.IsNullOrWhiteSpace(updateDto.Title))
        {
            mesh.Title = updateDto.Title.Trim();
        }

        if (updateDto.Tags != null)
        {
            mesh.Tags = updateDto.Tags.Trim();
        }

        mesh.UpdatedAt = DateTime.UtcNow;

        _context.Meshes.Update(mesh);
        await _context.SaveChangesAsync();

        return Ok(mesh);
    }

    /// <summary>
    /// Delete a mesh and its associated file
    /// </summary>
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteMesh(int id)
    {
        var mesh = await _context.Meshes.FindAsync(id);

        if (mesh == null)
        {
            return NotFound(new { message = "Mesh not found" });
        }

        // Delete physical file
        try
        {
            var filePath = Path.Combine(_env.WebRootPath, mesh.ModelFileURL.TrimStart('/'));
            if (System.IO.File.Exists(filePath))
            {
                System.IO.File.Delete(filePath);
                _logger.LogInformation($"File deleted: {filePath}");
            }
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error deleting file: {ex.Message}");
        }

        _context.Meshes.Remove(mesh);
        await _context.SaveChangesAsync();

        _logger.LogInformation($"Mesh deleted with ID: {id}");

        return Ok(new { message = "Mesh deleted successfully" });
    }
}

public class UpdateMeshDto
{
    public string? Title { get; set; }
    public string? Tags { get; set; }
}
