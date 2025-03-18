<?php

namespace App\Entity;

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Delete;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Post;
use ApiPlatform\Metadata\Put;
use App\Repository\QuestionOptionRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Annotation\Groups;

#[ORM\Entity(repositoryClass: QuestionOptionRepository::class)]
#[ApiResource(
    operations: [
        new Get(),
        new GetCollection(),
        new Post(),
        new Put(),
        new Delete(),
    ],
    normalizationContext: ['groups' => ['option:read']],
    denormalizationContext: ['groups' => ['option:write']],
)]
class QuestionOption
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups(['option:read', 'quiz:detail'])]
    private ?int $id = null;

    #[ORM\Column(length: 255)]
    #[Groups(['option:read', 'option:write', 'quiz:detail'])]
    private ?string $text = null;

    #[ORM\ManyToOne(inversedBy: 'options')]
    #[ORM\JoinColumn(nullable: false)]
    #[Groups(['option:read'])]
    private ?Question $question = null;

    #[ORM\Column(length: 10, nullable: true)]
    #[Groups(['option:read', 'option:write', 'quiz:detail'])]
    private ?string $optionId = null;

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getText(): ?string
    {
        return $this->text;
    }

    public function setText(string $text): static
    {
        $this->text = $text;
        return $this;
    }

    public function getQuestion(): ?Question
    {
        return $this->question;
    }

    public function setQuestion(?Question $question): static
    {
        $this->question = $question;
        return $this;
    }

    public function getOptionId(): ?string
    {
        return $this->optionId;
    }

    public function setOptionId(?string $optionId): static
    {
        $this->optionId = $optionId;
        return $this;
    }

    public function __toString(): string
    {
        return sprintf('%s) %s', $this->optionId, $this->text);
    }
} 