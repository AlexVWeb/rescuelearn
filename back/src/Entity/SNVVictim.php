<?php

namespace App\Entity;

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Post;
use ApiPlatform\Metadata\Put;
use ApiPlatform\Metadata\Delete;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Annotation\Groups;
use Symfony\Component\Validator\Constraints as Assert;

#[ORM\Entity]
#[ApiResource(
    operations: [
        new Get(normalizationContext: ['groups' => ['snv:read', 'snv:detail']]),
        new GetCollection(normalizationContext: ['groups' => ['snv:read']]),
        new Post(),
        new Put(),
        new Delete(),
    ],
    normalizationContext: ['groups' => ['snv:read']],
    denormalizationContext: ['groups' => ['snv:write']],
)]
class SNVVictim
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups(['snv:read'])]
    private ?int $id = null;

    #[ORM\Column(type: 'text')]
    #[Groups(['snv:read', 'snv:write'])]
    #[Assert\NotBlank]
    private ?string $description = null;

    #[ORM\Column]
    #[Groups(['snv:read', 'snv:write'])]
    #[Assert\NotBlank]
    #[Assert\Choice(choices: [0, 1, 2, 3])]
    private ?int $correctAnswer = null;

    #[ORM\Column(type: 'text')]
    #[Groups(['snv:read', 'snv:write'])]
    #[Assert\NotBlank]
    private ?string $explanation = null;

    #[ORM\ManyToOne(inversedBy: 'victimes')]
    #[ORM\JoinColumn(nullable: false)]
    #[Groups(['snv:read', 'snv:write'])]
    private ?SNVScenario $scenario = null;

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getDescription(): ?string
    {
        return $this->description;
    }

    public function setDescription(string $description): static
    {
        $this->description = $description;
        return $this;
    }

    public function getCorrectAnswer(): ?int
    {
        return $this->correctAnswer;
    }

    public function setCorrectAnswer(int $correctAnswer): static
    {
        $this->correctAnswer = $correctAnswer;
        return $this;
    }

    public function getExplanation(): ?string
    {
        return $this->explanation;
    }

    public function setExplanation(string $explanation): static
    {
        $this->explanation = $explanation;
        return $this;
    }

    public function getScenario(): ?SNVScenario
    {
        return $this->scenario;
    }

    public function setScenario(?SNVScenario $scenario): static
    {
        $this->scenario = $scenario;
        return $this;
    }
} 