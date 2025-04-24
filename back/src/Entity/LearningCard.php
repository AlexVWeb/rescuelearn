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
        new Get(normalizationContext: ['groups' => ['learning_card:read', 'learning_card:item:read']]),
        new GetCollection(
            normalizationContext: ['groups' => ['learning_card:read']],
            filters: ['learning_card.theme', 'learning_card.niveau'],
            paginationClientItemsPerPage: true,
            paginationItemsPerPage: 30,
            paginationMaximumItemsPerPage: 100
        ),
        new Post(
            denormalizationContext: ['groups' => ['learning_card:write']],
            security: "is_granted('ROLE_ADMIN')"
        ),
        new Put(
            denormalizationContext: ['groups' => ['learning_card:write']],
            security: "is_granted('ROLE_ADMIN')"
        ),
        new Delete(security: "is_granted('ROLE_ADMIN')")
    ],
    normalizationContext: ['groups' => ['learning_card:read']],
    denormalizationContext: ['groups' => ['learning_card:write']],
    paginationClientItemsPerPage: true
)]
class LearningCard
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups(['learning_card:read'])]
    private ?int $id = null;

    #[ORM\Column(length: 255)]
    #[Assert\NotBlank]
    #[Groups(['learning_card:read', 'learning_card:write'])]
    private ?string $theme = null;

    #[ORM\Column(length: 50)]
    #[Assert\NotBlank]
    #[Groups(['learning_card:read', 'learning_card:write'])]
    private ?string $niveau = null;

    #[ORM\Column(type: 'text')]
    #[Assert\NotBlank]
    #[Groups(['learning_card:read', 'learning_card:write'])]
    private ?string $info = null;

    #[ORM\Column(length: 255)]
    #[Assert\NotBlank]
    #[Groups(['learning_card:read', 'learning_card:write'])]
    private ?string $reference = null;

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getTheme(): ?string
    {
        return $this->theme;
    }

    public function setTheme(string $theme): static
    {
        $this->theme = $theme;
        return $this;
    }

    public function getNiveau(): ?string
    {
        return $this->niveau;
    }

    public function setNiveau(string $niveau): static
    {
        $this->niveau = $niveau;
        return $this;
    }

    public function getInfo(): ?string
    {
        return $this->info;
    }

    public function setInfo(string $info): static
    {
        $this->info = $info;
        return $this;
    }

    public function getReference(): ?string
    {
        return $this->reference;
    }

    public function setReference(string $reference): static
    {
        $this->reference = $reference;
        return $this;
    }
} 