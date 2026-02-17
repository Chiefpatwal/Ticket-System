from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="Ticket",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("title", models.CharField(max_length=200)),
                ("description", models.TextField()),
                (
                    "category",
                    models.CharField(
                        choices=[
                            ("billing", "Billing"),
                            ("technical", "Technical"),
                            ("account", "Account"),
                            ("general", "General"),
                        ],
                        default="general",
                        max_length=20,
                    ),
                ),
                (
                    "priority",
                    models.CharField(
                        choices=[
                            ("low", "Low"),
                            ("medium", "Medium"),
                            ("high", "High"),
                            ("critical", "Critical"),
                        ],
                        default="medium",
                        max_length=20,
                    ),
                ),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("open", "Open"),
                            ("in_progress", "In Progress"),
                            ("resolved", "Resolved"),
                            ("closed", "Closed"),
                        ],
                        default="open",
                        max_length=20,
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
        migrations.AddIndex(
            model_name="ticket",
            index=models.Index(fields=["category"], name="tickets_tic_categor_idx"),
        ),
        migrations.AddIndex(
            model_name="ticket",
            index=models.Index(fields=["priority"], name="tickets_tic_priorit_idx"),
        ),
        migrations.AddIndex(
            model_name="ticket",
            index=models.Index(fields=["status"], name="tickets_tic_status_idx"),
        ),
        migrations.AddIndex(
            model_name="ticket",
            index=models.Index(fields=["created_at"], name="tickets_tic_created_idx"),
        ),
    ]
