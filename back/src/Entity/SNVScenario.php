<?php

namespace App\Entity;

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Post;
use ApiPlatform\Metadata\Put;
use ApiPlatform\Metadata\Delete;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
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
    paginationClientItemsPerPage: true
)]
class SNVScenario
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups(['snv:read'])]
    private ?int $id = null;

    #[ORM\Column(length: 255)]
    #[Groups(['snv:read', 'snv:write'])]
    #[Assert\NotBlank]
    #[Assert\Length(min: 3, max: 255)]
    private ?string $title = null;

    #[ORM\Column(length: 50)]
    #[Groups(['snv:read', 'snv:write'])]
    #[Assert\NotBlank]
    #[Assert\Choice(choices: ['Débutant', 'Intermédiaire', 'Avancé'])]
    private ?string $level = null;

    #[ORM\Column(type: 'text')]
    #[Groups(['snv:read', 'snv:write'])]
    #[Assert\NotBlank]
    private ?string $description = null;

    #[ORM\OneToMany(mappedBy: 'scenario', targetEntity: SNVVictim::class, orphanRemoval: true)]
    #[Groups(['snv:detail', 'snv:write'])]
    private Collection $victimes;

    #[Groups(['snv:read'])]
    public function getVictimesCount(): int
    {
        return $this->victimes->count();
    }

    public function __construct()
    {
        $this->victimes = new ArrayCollection();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getTitle(): ?string
    {
        return $this->title;
    }

    public function setTitle(string $title): static
    {
        $this->title = $title;
        return $this;
    }

    public function getLevel(): ?string
    {
        return $this->level;
    }

    public function setLevel(string $level): static
    {
        $this->level = $level;
        return $this;
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

    /**
     * @return Collection<int, SNVVictim>
     */
    public function getVictimes(): Collection
    {
        return $this->victimes;
    }

    public function addVictime(SNVVictim $victime): static
    {
        if (!$this->victimes->contains($victime)) {
            $this->victimes->add($victime);
            $victime->setScenario($this);
        }
        return $this;
    }

    public function removeVictime(SNVVictim $victime): static
    {
        if ($this->victimes->removeElement($victime)) {
            if ($victime->getScenario() === $this) {
                $victime->setScenario(null);
            }
        }
        return $this;
    }

    public function __toString(): string
    {
        return $this->title ?? '';
    }
} 