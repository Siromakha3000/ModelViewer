using Microsoft.EntityFrameworkCore;
using ModelViewer.Models;

namespace ModelViewer.Data;

public class ModelViewerContext : DbContext
{
    public ModelViewerContext(DbContextOptions<ModelViewerContext> options) : base(options)
    {
    }

    public DbSet<Mesh> Meshes { get; set; } = null!;

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Mesh>()
            .HasKey(m => m.Id);

        modelBuilder.Entity<Mesh>()
            .Property(m => m.Title)
            .IsRequired()
            .HasMaxLength(200);

        modelBuilder.Entity<Mesh>()
            .Property(m => m.ModelFileURL)
            .IsRequired();

        modelBuilder.Entity<Mesh>()
            .Property(m => m.Tags)
            .HasDefaultValue(string.Empty);
    }
}
